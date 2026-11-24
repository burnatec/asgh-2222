'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'

const money = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 0 }).format(amount)
const fetcher = async (url: string) => { const response = await fetch(url); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed'); return data }
async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, error: (data.error as string) || '' }
}

type Analytics = { days: number; revenue: number; paidOrders: number; totalOrders: number; averageOrderValue: number; discounts: number; conversion: number; daily: { date: string; revenue: number; orders: number }[]; topProducts: { name: string; units: number; revenue: number }[]; statusCounts: Record<string, number> }

export function AdminAnalyticsPanel() {
  const { data, error } = useSWR<Analytics>('/api/admin/analytics', fetcher)
  if (error) return null
  const max = Math.max(1, ...(data?.daily.map((d) => d.revenue) ?? [1]))
  return (
    <section className="admin-panel admin-analytics">
      <div className="admin-panel-heading"><div><h2>Analytics</h2><p>Last {data?.days ?? 30} days, paid orders only.</p></div></div>
      {!data ? <p className="admin-empty">Loading analytics…</p> : <>
        <div className="analytics-kpis">
          <div><small>Revenue</small><strong>{money(data.revenue)}</strong></div>
          <div><small>Paid orders</small><strong>{data.paidOrders}</strong></div>
          <div><small>Avg order</small><strong>{money(data.averageOrderValue)}</strong></div>
          <div><small>Payment rate</small><strong>{Math.round(data.conversion * 100)}%</strong></div>
          <div><small>Discounts given</small><strong>{money(data.discounts)}</strong></div>
        </div>
        <div className="analytics-chart" role="img" aria-label="Daily revenue for the last 30 days">
          {data.daily.map((day) => <span key={day.date} title={`${day.date}: ${money(day.revenue)} (${day.orders} orders)`} style={{ height: `${Math.max(3, (day.revenue / max) * 100)}%` }} />)}
        </div>
        <h3 className="analytics-sub">Top products</h3>
        {data.topProducts.length ? <ol className="analytics-top">{data.topProducts.map((p) => <li key={p.name}><span>{p.name}</span><small>{p.units} sold</small><b>{money(p.revenue)}</b></li>)}</ol> : <p className="admin-empty">No paid sales yet.</p>}
        <div className="analytics-status">{Object.entries(data.statusCounts).map(([status, count]) => <span key={status}>{status}: <b>{count}</b></span>)}</div>
      </>}
    </section>
  )
}

type Coupon = { id: string; code: string; discount_type: 'percent' | 'fixed'; value: number; min_subtotal_ghs: number; max_uses: number | null; used_count: number; expires_at: string | null; active: boolean }

export function AdminCouponsPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const { data, mutate } = useSWR<{ coupons: Coupon[] }>('/api/admin/coupons', fetcher)
  const [form, setForm] = useState({ code: '', discount_type: 'percent', value: '', min_subtotal_ghs: '0', max_uses: '', per_user_limit: '1', expires_at: '' })

  async function create(event: FormEvent) {
    event.preventDefault()
    const result = await send('/api/admin/coupons', 'POST', { ...form, value: Number(form.value), min_subtotal_ghs: Number(form.min_subtotal_ghs), per_user_limit: Number(form.per_user_limit) })
    if (!result.ok) { onNotice(result.error || 'Could not create coupon.'); return }
    onNotice('Coupon created.')
    setForm({ ...form, code: '', value: '', max_uses: '', expires_at: '' })
    void mutate()
  }
  async function toggle(coupon: Coupon) {
    const result = await send('/api/admin/coupons', 'PATCH', { id: coupon.id, active: !coupon.active })
    onNotice(result.ok ? 'Coupon updated.' : result.error)
    void mutate()
  }

  return (
    <section className="admin-panel admin-coupons">
      <div className="admin-panel-heading"><div><h2>Coupons</h2><p>Discount codes applied at checkout.</p></div></div>
      <form className="admin-form" onSubmit={create}>
        <div className="admin-form-row"><label>Code<input required maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="AKWAABA10" /></label><label>Type<select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}><option value="percent">Percent off</option><option value="fixed">Fixed GH₵ off</option></select></label></div>
        <div className="admin-form-row"><label>Value<input type="number" min="0.01" step="0.01" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label><label>Min spend (GH₵)<input type="number" min="0" step="0.01" value={form.min_subtotal_ghs} onChange={(e) => setForm({ ...form, min_subtotal_ghs: e.target.value })} /></label></div>
        <div className="admin-form-row"><label>Max total uses<input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" /></label><label>Per customer<input type="number" min="1" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} /></label></div>
        <label>Expires<input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label>
        <button className="button-primary">Create coupon</button>
      </form>
      <ul className="coupon-list">
        {data?.coupons.map((c) => <li key={c.id} className={c.active ? '' : 'coupon-off'}><div><strong>{c.code}</strong><small>{c.discount_type === 'percent' ? `${Number(c.value)}% off` : `${money(Number(c.value))} off`} · used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}{c.expires_at ? ` · ends ${new Date(c.expires_at).toLocaleDateString('en-GH')}` : ''}</small></div><button onClick={() => toggle(c)}>{c.active ? 'Disable' : 'Enable'}</button></li>)}
      </ul>
    </section>
  )
}

type Review = { id: string; rating: number; title: string | null; body: string; author_name: string; status: string; verified_purchase: boolean; products: { name: string } | null }

export function AdminReviewsPanel({ canModerate, onNotice }: { canModerate: boolean; onNotice: (message: string) => void }) {
  const { data, mutate } = useSWR<{ reviews: Review[] }>('/api/admin/reviews', fetcher)
  async function moderate(id: string, status: string) {
    const result = await send('/api/admin/reviews', 'PATCH', { id, status })
    onNotice(result.ok ? 'Review updated.' : result.error)
    void mutate()
  }
  return (
    <section className="admin-panel admin-reviews">
      <div className="admin-panel-heading"><div><h2>Reviews</h2><p>Approve before they appear on the storefront.</p></div><span>{data?.reviews.filter((r) => r.status === 'pending').length ?? 0} pending</span></div>
      <ul className="review-admin-list">
        {data?.reviews.length === 0 && <li className="admin-empty">No reviews yet.</li>}
        {data?.reviews.map((r) => (
          <li key={r.id}>
            <div><strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.products?.name}</strong><p>{r.title ? `${r.title}: ` : ''}{r.body}</p><small>{r.author_name}{r.verified_purchase ? ' · verified' : ''} · {r.status}</small></div>
            {canModerate && <div className="inventory-actions">{r.status !== 'approved' && <button onClick={() => moderate(r.id, 'approved')}>Approve</button>}{r.status !== 'hidden' && <button onClick={() => moderate(r.id, 'hidden')}>Hide</button>}</div>}
          </li>
        ))}
      </ul>
    </section>
  )
}

type Variant = { id: string; label: string; sku: string | null; price_ghs: number | null; stock: number; active: boolean }

export function AdminVariantsPanel({ products, onNotice }: { products: { id: string; name: string; active: boolean }[]; onNotice: (message: string) => void }) {
  const active = products.filter((p) => p.active)
  const [productId, setProductId] = useState('')
  const selected = productId || active[0]?.id || ''
  const { data, mutate } = useSWR<{ variants: Variant[] }>(selected ? `/api/admin/variants?productId=${selected}` : null, fetcher)
  const [form, setForm] = useState({ label: '', price_ghs: '', stock: '0', sku: '' })

  async function add(event: FormEvent) {
    event.preventDefault()
    const result = await send('/api/admin/variants', 'POST', { product_id: selected, label: form.label, price_ghs: form.price_ghs, stock: Number(form.stock), sku: form.sku })
    if (!result.ok) { onNotice(result.error || 'Could not add variant.'); return }
    onNotice('Variant added.')
    setForm({ label: '', price_ghs: '', stock: '0', sku: '' })
    void mutate()
  }
  async function patch(id: string, body: Record<string, unknown>) {
    const result = await send('/api/admin/variants', 'PATCH', { id, ...body })
    onNotice(result.ok ? 'Variant updated.' : result.error)
    void mutate()
  }

  return (
    <section className="admin-panel admin-variants">
      <div className="admin-panel-heading"><div><h2>Variants</h2><p>Sizes, weights or scents with their own stock and price.</p></div></div>
      <label className="variant-product-select">Product<select value={selected} onChange={(e) => setProductId(e.target.value)}>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <ul className="variant-admin-list">
        {data?.variants.map((v) => (
          <li key={v.id} className={v.active ? '' : 'coupon-off'}>
            <div><strong>{v.label}</strong><small>{v.sku || 'No SKU'} · {v.price_ghs != null ? money(Number(v.price_ghs)) : 'Base price'}</small></div>
            <input aria-label={`Stock for ${v.label}`} type="number" min="0" defaultValue={v.stock} onBlur={(e) => { if (Number(e.target.value) !== v.stock) void patch(v.id, { stock: Number(e.target.value) }) }} />
            <button onClick={() => patch(v.id, { active: !v.active })}>{v.active ? 'Hide' : 'Show'}</button>
          </li>
        ))}
      </ul>
      <form className="admin-form" onSubmit={add}>
        <div className="admin-form-row"><label>Option label<input required maxLength={60} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="500g" /></label><label>SKU<input maxLength={60} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label></div>
        <div className="admin-form-row"><label>Price override<input type="number" min="0" step="0.01" value={form.price_ghs} onChange={(e) => setForm({ ...form, price_ghs: e.target.value })} placeholder="Base price" /></label><label>Stock<input type="number" min="0" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label></div>
        <button className="button-primary" disabled={!selected}>Add variant</button>
      </form>
    </section>
  )
}
