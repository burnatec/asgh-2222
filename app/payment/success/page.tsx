import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams
  return (
    <main className="payment-page">
      <section className="payment-card">
        <span className="payment-check"><Check size={26} /></span>
        <span className="eyebrow">PAYMENT CONFIRMED</span>
        <h1>Good things are on their way.</h1>
        <p>Your payment is confirmed. We&apos;re getting your order ready with care.</p>
        {reference && <div className="payment-reference"><span>Order reference</span><strong>{reference}</strong></div>}
        <Link href="/" className="button-primary">Back to the store <ArrowRight size={15} /></Link>
      </section>
    </main>
  )
}
