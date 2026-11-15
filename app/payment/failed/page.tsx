import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PaymentFailedPage() {
  return (
    <main className="payment-page">
      <section className="payment-card">
        <span className="eyebrow">PAYMENT NOT CONFIRMED</span>
        <h1>Let&apos;s try that again.</h1>
        <p>We couldn&apos;t confirm this payment. If you were charged, contact us with your order reference and we&apos;ll help right away.</p>
        <Link href="/" className="button-primary"><ArrowLeft size={15} /> Back to the store</Link>
      </section>
    </main>
  )
}
