'use client'

import { FormEvent, useRef, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'

type CheckoutItem = { product_id: string; quantity: number }
type ShippingOption = { method_code: string; method_name: string; description: string; fee_ghs: number; min_days: number; max_days: number; unit: 'hours' | 'business_days'; requires_pickup: boolean }
type PickupLocation = { id: string; name: string; address: string; city: string }
type OptionsResponse = { options: ShippingOption[]; pickup_locations: PickupLocation[] }

const money = (value: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value)
const eta = (option: ShippingOption) => {
  const range = option.min_days === option.max_days ? `${option.min_days}` : `${option.min_days}-${option.max_days}`
  return option.unit === 'hours' ? `${range} hours` : `${range} business days`
}

async function fetchOptions([, items, city, region]: [string, CheckoutItem[], string, string]): Promise<OptionsResponse> {
  const response = await fetch('/api/shipping/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, city, region }),
  })
  if (!response.ok) throw new Error('Could not load delivery options')
  return response.json()
}

export function CheckoutModal({ items, total, onClose, onAuthRequired }: { items: CheckoutItem[]; total: number; onClose: () => void; onAuthRequired: () => void }) {
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', city: 'Accra', region: 'Greater Accra' })
  const [location, setLocation] = useState({ city: 'Accra', region: 'Greater Accra' })
  const [method, setMethod] = useState('')
  const [pickupId, setPickupId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const idempotencyKey = useRef<string | null>(null)
  const keySignature = useRef('')

  const { data, error: optionsError, isLoading: optionsLoading } = useSWR(
    location.city.trim() && location.region.trim() ? ['shipping-options', items, location.city, location.region] : null,
    fetchOptions,
    { revalidateOnFocus: false },
  )
  const options = data?.options ?? []
  const pickupLocations = data?.pickup_locations ?? []
  const selected = options.find((option) => option.method_code === method) ?? options[0]
  const selectedMethod = selected?.method_code ?? ''
  const needsPickup = Boolean(selected?.requires_pickup)
  const selectedPickup = pickupLocations.some((location) => location.id === pickupId) ? pickupId : pickupLocations[0]?.id ?? ''
  const shippingFee = selected?.fee_ghs ?? 0
  const canSubmit = Boolean(selected) && (!needsPickup || Boolean(selectedPickup))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) {
      setError('Choose a delivery option to continue.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const signature = JSON.stringify([items, selectedMethod, needsPickup ? selectedPickup : null, form.city, form.region])
      if (keySignature.current !== signature) {
        keySignature.current = signature
        idempotencyKey.current = crypto.randomUUID()
      }
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shipping: form,
          idempotencyKey: idempotencyKey.current,
          shippingMethod: selectedMethod,
          pickupLocationId: needsPickup ? selectedPickup : null,
        }),
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
        <p className="account-intro">Choose how you&apos;d like to receive your order. Pay securely with Mobile Money or card.</p>
        <form className="account-form" onSubmit={submit}>
          <label>Full name<input autoComplete="name" required maxLength={120} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
          <label>Mobile number<input autoComplete="tel" type="tel" required maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="024 000 0000" /></label>
          <label>Street address<input autoComplete="street-address" required maxLength={160} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <div className="checkout-location"><label>City<input autoComplete="address-level2" required maxLength={100} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} onBlur={() => setLocation({ city: form.city, region: form.region })} /></label><label>Region<input autoComplete="address-level1" required maxLength={100} value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} onBlur={() => setLocation({ city: form.city, region: form.region })} /></label></div>
          <fieldset className="checkout-methods" aria-busy={optionsLoading}>
            <legend>Delivery method</legend>
            {optionsLoading && <p className="checkout-terms">Finding delivery options…</p>}
            {optionsError && <p className="form-error" role="alert">We could not load delivery options. Please try again.</p>}
            {!optionsLoading && !optionsError && !options.length && <p className="form-error" role="alert">We don&apos;t deliver to this address yet. Please contact us for help.</p>}
            {options.map((option) => (
              <label key={option.method_code} className="checkout-method">
                <input type="radio" name="shipping-method" value={option.method_code} checked={selectedMethod === option.method_code} onChange={() => setMethod(option.method_code)} />
                <span><strong>{option.method_name}</strong><small>{eta(option)} · {option.description}</small></span>
                <b>{option.fee_ghs === 0 ? 'Free' : money(option.fee_ghs)}</b>
              </label>
            ))}
          </fieldset>
          {needsPickup && (
            <label>Pickup station
              <select required value={selectedPickup} onChange={(event) => setPickupId(event.target.value)}>
                {pickupLocations.map((pickup) => <option key={pickup.id} value={pickup.id}>{pickup.name} - {pickup.address}, {pickup.city}</option>)}
              </select>
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="checkout-total"><span>Total including delivery</span><strong>{money(total + shippingFee)}</strong></div>
          <button className="button-primary account-submit" disabled={loading || !canSubmit}>{loading ? 'Preparing secure payment…' : 'Continue to payment'} <ArrowRight size={15} /></button>
        </form>
        <p className="checkout-terms">By continuing, you agree to our terms and delivery policy.</p>
      </section>
    </div>
  )
}
