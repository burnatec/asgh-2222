import { NextResponse, type NextRequest } from 'next/server'
import { finalizeOrderPayment, getPaystackSecret } from '@/lib/payments'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const origin = process.env.APP_PUBLIC_URL || request.nextUrl.origin
  const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref')
  const secret = getPaystackSecret()
  if (!reference || !/^AFRO-[A-F0-9]{16}$/.test(reference) || !secret) {
    return NextResponse.redirect(new URL('/payment/failed', origin))
  }

  try {
    const outcome = await finalizeOrderPayment(reference, secret)
    if (outcome === 'paid') return NextResponse.redirect(new URL(`/payment/success?reference=${encodeURIComponent(reference)}`, origin))
    const target = new URL('/payment/failed', origin)
    target.searchParams.set('reference', reference)
    if (outcome === 'pending') target.searchParams.set('state', 'pending')
    return NextResponse.redirect(target)
  } catch {
    const target = new URL('/payment/failed', origin)
    target.searchParams.set('reference', reference)
    target.searchParams.set('state', 'pending')
    return NextResponse.redirect(target)
  }
}
