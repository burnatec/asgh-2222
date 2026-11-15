'use client'

import { FormEvent, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'

type CheckoutItem = { product_id: string; quantity: number }

export function CheckoutModal({ items, total, onClose, onAuthRequired }: { items: CheckoutItem[]; total: number; onClose: () => void; onAuthRequired: () => void }) {
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', city: 'Accra', region: 'Greater Accra' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const idempotencyKey = useRef<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      idempotencyKey.current ??= crypto.randomUUID()
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shipping: form, idempotencyKey: idempotencyKey.current }),
      })
      const result = await response.json()
      if (response.status === 401) {
        onAuthRequired()
        return
      }
      if (!response.ok) {
        setError(result.error || 'Checkout could not be completed.')
        return
      }
      window.location.assign(result.authorization_url)
    } catch {
      setError('We could not connect to checkout. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay account-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="account-modal checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <button className="icon-button account-close" aria-label="Close checkout" onClick={onClose}><X size={19} /></button>
        <button className="checkout-back" onClick={onClose}><ArrowLeft size={14} /> Back to your bag</button>
        <span className="eyebrow">SAFE & SECURE CHECKOUT</span>
        <h2 id="checkout-title">Where should we send it?</h2>
        <p className="account-intro">Delivery is GH₵25. Pay securely with Mobile Money or card.</p>
        <form className="account-form" onSubmit={submit}>
          <label>Full name<input autoComplete="name" required maxLength={120} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
          <label>Mobile number<input autoComplete="tel" type="tel" required maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="024 000 0000" /></label>
          <label>Street address<input autoComplete="street-address" required maxLength={160} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <div className="checkout-location"><label>City<input autoComplete="address-level2" required maxLength={100} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label>Region<input autoComplete="address-level1" required maxLength={100} value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="checkout-total"><span>Total including delivery</span><strong>{new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(total + 25)}</strong></div>
          <button className="button-primary account-submit" disabled={loading}>{loading ? 'Preparing secure payment…' : 'Continue to payment'} <ArrowRight size={15} /></button>
        </form>
        <p className="checkout-terms">By continuing, you agree to our terms and delivery policy.</p>
      </section>
    </div>
  )
}
