import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Order service unavailable')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Enter your order number and email address.' }, { status: 400 })
    const { reference, email } = body as Record<string, unknown>
    if (typeof reference !== 'string' || typeof email !== 'string' || reference.trim().length < 5 || reference.trim().length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Enter a valid order number and email address.' }, { status: 400 })
    }
    const admin = adminClient()
    const { data: order, error } = await admin.from('orders').select('id,reference,user_id,status,payment_status,created_at,shipping_details').eq('reference', reference.trim()).maybeSingle()
    if (error || !order) return NextResponse.json({ error: 'We could not find an order matching those details. Check the order number and email address.' }, { status: 404 })
    const { data: { user }, error: userError } = await admin.auth.admin.getUserById(order.user_id)
    if (userError || !user?.email || user.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'We could not find an order matching those details. Check the order number and email address.' }, { status: 404 })
    }
    const shipping = order.shipping_details && typeof order.shipping_details === 'object' ? order.shipping_details as Record<string, unknown> : {}
    return NextResponse.json({
      reference: order.reference,
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      city: typeof shipping.city === 'string' ? shipping.city : '',
      region: typeof shipping.region === 'string' ? shipping.region : '',
    }, { headers: { 'Cache-Control': 'no-store, private' } })
  } catch {
    return NextResponse.json({ error: 'Order tracking is temporarily unavailable. Please try again later.' }, { status: 500 })
  }
}
