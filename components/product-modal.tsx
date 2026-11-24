'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { Heart, Plus, Star, X } from 'lucide-react'

export type Variant = { id: string; label: string; price_ghs: number | null; stock: number; active: boolean }
export type ModalProduct = { id: string; name: string; description?: string; price_ghs: number; image_url: string; category: string; stock?: number; product_variants?: Variant[] }
type ReviewsResponse = { reviews: { id: string; author_name: string; rating: number; title: string | null; body: string; verified_purchase: boolean; created_at: string }[]; average: number; count: number }

const money = (value: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value)
const fetchReviews = async (url: string): Promise<ReviewsResponse> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load reviews')
  return response.json()
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />)}</span>
}

export function ProductModal({ product, saved, onToggleSave, onAdd, onClose, onAuthRequired }: {
  product: ModalProduct; saved: boolean; onToggleSave: () => void; onAdd: (variant?: Variant) => void; onClose: () => void; onAuthRequired: () => void
}) {
  const variants = (product.product_variants ?? []).filter((v) => v.active)
  const [variantId, setVariantId] = useState('')
  const variant = variants.find((v) => v.id === variantId)
  const price = variant?.price_ghs ?? product.price_ghs
  const available = variants.length ? (variant ? variant.stock : 1) : (product.stock ?? 1)
  const { data, mutate } = useSWR(`/api/reviews?productId=${product.id}`, fetchReviews, { revalidateOnFocus: false })
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function submitReview(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setMessage('')
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, rating, title, body }) })
    const result = await response.json().catch(() => ({}))
    setSending(false)
    if (response.status === 401) { onAuthRequired(); return }
    setMessage(result.message || result.error || 'Something went wrong.')
    if (response.ok) { setRating(0); setTitle(''); setBody(''); void mutate() }
  }

  return (
    <div className="overlay account-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <button className="icon-button account-close" aria-label="Close product" onClick={onClose}><X size={19} /></button>
        <div className="product-modal-grid">
          <img src={product.image_url || '/placeholder.svg'} alt={product.name} className="product-modal-image" />
          <div className="product-modal-copy">
            <span className="eyebrow">{product.category.toUpperCase()}</span>
            <h2 id="product-modal-title">{product.name}</h2>
            <div className="product-modal-rating">{data && data.count > 0 ? <><Stars value={data.average} /><small>{data.average} ({data.count} review{data.count === 1 ? '' : 's'})</small></> : <small>No reviews yet</small>}</div>
            <strong className="product-modal-price">{money(price)}</strong>
            <p>{product.description}</p>
            {variants.length > 0 && (
              <fieldset className="variant-picker">
                <legend>Choose an option</legend>
                <div>{variants.map((v) => <button type="button" key={v.id} disabled={v.stock < 1} aria-pressed={variantId === v.id} className={variantId === v.id ? 'variant-active' : ''} onClick={() => setVariantId(v.id)}>{v.label}{v.stock < 1 ? ' (sold out)' : ''}</button>)}</div>
              </fieldset>
            )}
            <div className="product-modal-actions">
              <button className="button-primary" disabled={available < 1 || (variants.length > 0 && !variant)} onClick={() => { onAdd(variant); onClose() }}><Plus size={15} /> {available < 1 ? 'Sold out' : variants.length && !variant ? 'Select an option' : 'Add to bag'}</button>
              <button className={`save-inline ${saved ? 'is-saved' : ''}`} aria-pressed={saved} onClick={onToggleSave}><Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save for later'}</button>
            </div>
          </div>
        </div>
        <div className="reviews-block">
          <h3>Customer reviews</h3>
          {data?.reviews.map((review) => (
            <article key={review.id} className="review-card">
              <div><Stars value={review.rating} size={12} /><strong>{review.title || review.author_name}</strong></div>
              <p>{review.body}</p>
              <small>{review.author_name}{review.verified_purchase ? ' · Verified purchase' : ''} · {new Date(review.created_at).toLocaleDateString('en-GH')}</small>
            </article>
          ))}
          <form className="review-form" onSubmit={submitReview}>
            <strong>Write a review</strong>
            <div className="review-stars" role="radiogroup" aria-label="Your rating">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => setRating(n)}><Star size={22} fill={n <= rating ? 'currentColor' : 'none'} /></button>)}</div>
            <input aria-label="Review title" placeholder="Title (optional)" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea aria-label="Your review" required minLength={5} maxLength={2000} rows={3} placeholder="Tell others what you thought" value={body} onChange={(event) => setBody(event.target.value)} />
            {message && <p role="status" className="review-message">{message}</p>}
            <button className="button-primary" disabled={sending || rating < 1}>{sending ? 'Sending…' : 'Submit review'}</button>
          </form>
        </div>
      </section>
    </div>
  )
}
