import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPaystackSecret } from '@/lib/payments'

export const runtime = 'nodejs'

const serviceClient = () => {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function validShipping(value: unknown): value is { full_name: string; phone: string; address: string; city: string; region: string } {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return ['full_name', 'phone', 'address', 'city', 'region'].every((key) => typeof data[key] === 'string' && (data[key] as string).trim().length > 1 && (data[key] as string).length <= 160)
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) return NextResponse.json({ error: 'Sign in before checking out.' }, { status: 401 })

    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid checkout request.' }, { status: 400 })
    const { items, shipping, idempotencyKey } = body as Record<string, unknown>
    if (!Array.isArray(items) || !items.length || items.length > 20 || !validShipping(shipping) || typeof idempotencyKey !== 'string' || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
      return NextResponse.json({ error: 'Check your delivery details and bag, then try again.' }, { status: 400 })
    }

    const seen = new Set<string>()
    let itemCount = 0
    for (const item of items) {
      if (!item || typeof item !== 'object') return NextResponse.json({ error: 'Invalid bag items.' }, { status: 400 })
      const value = item as Record<string, unknown>
      if (typeof value.product_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.product_id) || !Number.isInteger(value.quantity) || (value.quantity as number) < 1 || (value.quantity as number) > 20 || seen.has(value.product_id)) {
        return NextResponse.json({ error: 'Invalid bag items.' }, { status: 400 })
      }
      seen.add(value.product_id)
      itemCount += value.quantity as number
    }
    if (itemCount > 30) return NextResponse.json({ error: 'Your bag is over the 30 item limit.' }, { status: 400 })

    const secret = getPaystackSecret()
    if (!secret) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })

    const admin = serviceClient()
    const { data: orderRows, error: orderError } = await admin.rpc('create_checkout_order', {
      p_user_id: user.id,
      p_idempotency_key: idempotencyKey,
      p_items: items,
      p_shipping: shipping,
    })
    if (orderError || !orderRows?.[0]) return NextResponse.json({ error: 'One or more items are unavailable. Please refresh your bag.' }, { status: 409 })
    const order = orderRows[0] as { order_id: string; order_reference: string; total_ghs: number }

    const { data: existing } = await admin.from('orders').select('payment_status,payment_url').eq('id', order.order_id).eq('user_id', user.id).maybeSingle()
    const origin = process.env.APP_PUBLIC_URL || new URL(request.url).origin
    if (existing?.payment_status === 'paid') {
      return NextResponse.json({ authorization_url: new URL(`/payment/success?reference=${encodeURIComponent(order.order_reference)}`, origin).toString(), reference: order.order_reference })
    }
    if (existing?.payment_url) {
      return NextResponse.json({ authorization_url: existing.payment_url, reference: order.order_reference })
    }

    const callbackOrigin = process.env.APP_PUBLIC_URL || new URL(request.url).origin
    const callbackUrl = new URL('/api/payments/verify', callbackOrigin).toString()
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(Number(order.total_ghs) * 100),
        currency: 'GHS',
        reference: order.order_reference,
        callback_url: callbackUrl,
        channels: ['mobile_money', 'card'],
        metadata: { order_id: order.order_id, user_id: user.id },
      }),
      cache: 'no-store',
    })
    const payment = await paystackResponse.json().catch(() => null) as {
      status?: boolean
      message?: string
      data?: { authorization_url?: string }
    } | null
    if (!paystackResponse.ok || !payment?.status || !payment.data?.authorization_url) {
      console.error('[checkout] Paystack initialization failed', {
        httpStatus: paystackResponse.status,
        providerMessage: typeof payment?.message === 'string' ? payment.message.slice(0, 180) : 'Invalid provider response',
      })
      return NextResponse.json({ error: 'We could not start payment. Please try again or contact support.' }, { status: 502 })
    }
    await admin.from('orders').update({ payment_reference: order.order_reference, payment_url: payment.data.authorization_url }).eq('id', order.order_id).eq('user_id', user.id)
    return NextResponse.json({ authorization_url: payment.data.authorization_url, reference: order.order_reference })
  } catch {
    return NextResponse.json({ error: 'Checkout could not be completed. Please try again.' }, { status: 500 })
  }
}
