import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { finalizeOrderPayment, getPaystackSecret } from '@/lib/payments'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const secret = getPaystackSecret()
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') || ''
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event?: string; data?: { reference?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ received: true })
  }

  const reference = event.data?.reference
  if (event.event === 'charge.success' && typeof reference === 'string' && /^AFRO-[A-F0-9]{16}$/.test(reference)) {
    try {
      await finalizeOrderPayment(reference, secret)
    } catch (error) {
      console.error('[payments] Webhook finalize failed:', error)
      return NextResponse.json({ error: 'Retry' }, { status: 500 })
    }
  }
  return NextResponse.json({ received: true })
}
