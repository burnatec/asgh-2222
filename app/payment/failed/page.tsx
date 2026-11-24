import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function PaymentFailedPage({ searchParams }: { searchParams: Promise<{ reference?: string; state?: string }> }) {
  const { reference, state } = await searchParams
  const pending = state === 'pending'
  return (
    <main className="payment-page">
      <section className="payment-card">
        <span className="eyebrow">{pending ? 'PAYMENT PROCESSING' : 'PAYMENT NOT CONFIRMED'}</span>
        <h1>{pending ? 'We are still confirming your payment.' : 'Let\u2019s try that again.'}</h1>
        <p>
          {pending
            ? 'Mobile Money approvals can take a few minutes. If you approved the payment, your order will be confirmed automatically and we will email you. No need to pay again.'
            : 'We couldn\u2019t confirm this payment. If you were charged, contact us with your order reference and we\u2019ll help right away.'}
        </p>
        {reference && /^AFRO-[A-F0-9]{16}$/.test(reference) && <div className="payment-reference"><span>Order reference</span><strong>{reference}</strong></div>}
        <Link href="/" className="button-primary"><ArrowLeft size={15} /> Back to the store</Link>
      </section>
    </main>
  )
}
