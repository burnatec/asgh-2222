import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref')
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!reference || !/^AFRO-[A-F0-9]{16}$/.test(reference) || !secret) {
    return NextResponse.redirect(new URL('/payment/failed', origin))
  }

  try {
    const admin = adminClient()
    const { data: order } = await admin.from('orders').select('id,reference,total_ghs,payment_status').eq('reference', reference).maybeSingle()
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

    const { error } = await admin.from('orders').update({ payment_status: 'paid', status: 'processing', payment_reference: reference }).eq('id', order.id).eq('payment_status', 'pending')
    if (error) return NextResponse.redirect(new URL('/payment/failed', origin))
    return NextResponse.redirect(new URL(`/payment/success?reference=${encodeURIComponent(reference)}`, origin))
  } catch {
    return NextResponse.redirect(new URL('/payment/failed', origin))
  }
}
