import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmation } from '@/lib/order-confirmation-email'

export const runtime = 'nodejs'

function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: NextRequest) {
  const origin = process.env.APP_PUBLIC_URL || request.nextUrl.origin
  const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref')
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!reference || !/^AFRO-[A-F0-9]{16}$/.test(reference) || !secret) {
    return NextResponse.redirect(new URL('/payment/failed', origin))
  }

  try {
    const admin = adminClient()
    const { data: order } = await admin.from('orders').select('id,reference,total_ghs,payment_status,user_id,shipping_details').eq('reference', reference).maybeSingle()
    if (!order) return NextResponse.redirect(new URL('/payment/failed', origin))
    if (order.payment_status === 'paid') return NextResponse.redirect(new URL(`/payment/success?reference=${encodeURIComponent(reference)}`, origin))

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store',
    })
    const result = await response.json()
    const expectedAmount = Math.round(Number(order.total_ghs) * 100)
    if (!response.ok || !result.status || result.data?.status !== 'success' || result.data?.currency !== 'GHS' || result.data?.reference !== reference || result.data?.amount !== expectedAmount) {
      return NextResponse.redirect(new URL('/payment/failed', origin))
    }

    const { data: paidOrder, error } = await admin.from('orders').update({ payment_status: 'paid', status: 'processing', payment_reference: reference }).eq('id', order.id).eq('payment_status', 'pending').select('id').maybeSingle()
    if (error) return NextResponse.redirect(new URL('/payment/failed', origin))

    if (paidOrder) {
      try {
        const { data: { user } } = await admin.auth.admin.getUserById(order.user_id)
        const shipping = order.shipping_details && typeof order.shipping_details === 'object' ? order.shipping_details as Record<string, unknown> : {}
        if (user?.email) {
          await sendOrderConfirmation({
            recipient: user.email,
            reference: order.reference,
            totalGhs: Number(order.total_ghs),
            shipping: {
              full_name: typeof shipping.full_name === 'string' ? shipping.full_name : 'there',
              address: typeof shipping.address === 'string' ? shipping.address : '',
              city: typeof shipping.city === 'string' ? shipping.city : '',
              region: typeof shipping.region === 'string' ? shipping.region : '',
            },
          })
        }
      } catch (emailError) {
        console.error('[payments] Order confirmation email failed:', emailError)
      }
    }
    return NextResponse.redirect(new URL(`/payment/success?reference=${encodeURIComponent(reference)}`, origin))
  } catch {
    return NextResponse.redirect(new URL('/payment/failed', origin))
  }
}
