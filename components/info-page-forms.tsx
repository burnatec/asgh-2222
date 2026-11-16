'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle, PackageCheck } from 'lucide-react'

type TrackResult = { reference: string; status: string; paymentStatus: string; createdAt: string; city: string; region: string }

export function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setState('sending')
    setError('')
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(formData.entries())) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'We could not send your message. Please try again.')
      form.reset()
      setState('sent')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not send your message. Please try again.')
      setState('error')
    }
  }
  return <form className="info-form" onSubmit={submit}>
    <label>Name<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Phone number <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
    <label>Subject<input name="subject" required minLength={2} maxLength={160} /></label>
    <label>Message<textarea name="message" rows={5} required minLength={10} maxLength={3000} /></label>
    <label className="form-honeypot" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <button type="submit" className="info-submit" disabled={state === 'sending'}>{state === 'sending' ? <><LoaderCircle className="spin" size={17} /> Sending…</> : <>Send message <ArrowRight size={16} /></>}</button>
    {state === 'sent' && <p className="form-success" role="status"><CheckCircle2 size={17} /> Thanks for reaching out. Your message has been sent to our team.</p>}
    {state === 'error' && <p className="form-error" role="alert">{error}</p>}
    <p className="form-privacy">We&apos;ll use your details to respond to your enquiry. See our <a href="/privacy-policy">Privacy Policy</a>.</p>
  </form>
}

export function OrderTracker() {
  const [result, setResult] = useState<TrackResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/api/track-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: form.get('reference'), email: form.get('email') }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'We could not find that order. Check your details and try again.')
      setResult(data as TrackResult)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not find that order. Check your details and try again.')
    } finally {
      setBusy(false)
    }
  }
  return <>
    <form className="info-form track-form" onSubmit={submit}>
      <label>Order number<input name="reference" required maxLength={80} placeholder="For example, AFRO-…" autoComplete="off" /></label>
      <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <button type="submit" className="info-submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Looking up order…</> : <>Track order <ArrowRight size={16} /></>}</button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {result && <section className="track-result" aria-live="polite" aria-label="Order status">
      <div className="track-result-title"><PackageCheck size={20} /><div><span>Order reference</span><strong>{result.reference}</strong></div><span className="track-status">{result.status}</span></div>
      <div className="track-result-grid"><div><small>Payment</small><strong className={result.paymentStatus === 'paid' ? 'paid' : ''}>{result.paymentStatus}</strong></div><div><small>Order placed</small><strong>{new Date(result.createdAt).toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></div><div><small>Delivery area</small><strong>{[result.city, result.region].filter(Boolean).join(', ') || 'Details confirmed with our team'}</strong></div></div>
      <p className="track-update">{result.status === 'pending' ? 'Your order has been received and is awaiting processing.' : result.status === 'processing' ? 'Your order is being prepared. We’ll update its status as it moves through fulfilment.' : result.status === 'shipped' ? 'Your order has been marked as shipped. For delivery timing or courier details, please contact our team.' : result.status === 'delivered' ? 'Your order has been marked as delivered. We hope you enjoy your purchase.' : result.status === 'cancelled' ? 'This order has been marked as cancelled. Contact our team if you have questions about its payment or refund.' : 'The latest order update is shown above.'}</p>
      <p className="track-estimate">Delivery estimates and courier details are not available in the order record. Please contact support for the latest delivery information.</p>
    </section>}
  </>
}
