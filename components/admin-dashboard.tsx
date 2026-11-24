'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Box, ChevronLeft, ChevronRight, CircleDollarSign, ImagePlus, PackageCheck, Plus, ShieldAlert, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { AdminOrderStatus } from '@/components/admin-order-status'
import { AdminAnalyticsPanel, AdminCouponsPanel, AdminReviewsPanel, AdminVariantsPanel } from '@/components/admin-commerce-panel'
import { AdminActivityPanel, AdminCategoriesPanel, AdminStaffPanel, type Category } from '@/components/admin-team-panel'

const MAX_IMAGES = 8

type Product = { id: string; name: string; description: string; price_ghs: number; compare_at_price_ghs: number | null; image_url: string; images: string[] | null; category: string; stock: number; featured: boolean; active: boolean }
type Order = { id: string; reference: string; user_id: string; status: string; payment_status: string; total_ghs: number; created_at: string; shipping_details: Record<string, string>; carrier: string | null; tracking_number: string | null }
type Customer = { id: string; full_name: string | null; created_at: string }
type Dashboard = { me: { email: string; role: string; permissions: string[] }; categories: Category[]; products: Product[]; orders: Order[]; customers: Customer[]; metrics: { revenue: number; orders: number; customers: number; lowStock: number } }
const fetcher = async (url: string): Promise<Dashboard> => { const response = await fetch(url); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load the dashboard.'); if (!data?.me || !Array.isArray(data.me.permissions)) throw new Error('Staff access required.'); return data }
const money = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 0 }).format(amount)

export function AdminDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin', fetcher)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price_ghs: '', compare_at_price_ghs: '', category: 'Pantry', stock: '0', featured: false })
  const [images, setImages] = useState<string[]>([])
  const [imageUrlDraft, setImageUrlDraft] = useState('')

  function addImageUrl() {
    const url = imageUrlDraft.trim()
    if (!url) return
    if (!url.startsWith('https://')) { setNotice('Image links must start with https://'); return }
    if (images.length >= MAX_IMAGES) { setNotice(`You can add up to ${MAX_IMAGES} images per product.`); return }
    setImages((current) => (current.includes(url) ? current : [...current, url]))
    setImageUrlDraft('')
    setNotice('')
  }

  function makePrimary(index: number) {
    setImages((current) => [current[index], ...current.filter((_, i) => i !== index)])
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function uploadProductImages(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    const room = MAX_IMAGES - images.length
    if (room <= 0) { setNotice(`You can add up to ${MAX_IMAGES} images per product.`); return }
    setUploading(true)
    setNotice(files.length > room ? `Only the first ${room} image${room === 1 ? '' : 's'} will be added (limit ${MAX_IMAGES}).` : '')
    const uploaded: string[] = []
    let failure = ''
    for (const file of files.slice(0, room)) {
      const upload = new FormData()
      upload.set('file', file)
      try {
        const response = await fetch('/api/admin/upload', { method: 'POST', body: upload })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Image upload failed.')
        uploaded.push(result.url)
      } catch (uploadError) {
        failure = `${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Image upload failed.'}`
      }
    }
    if (uploaded.length) setImages((current) => [...current, ...uploaded])
    setNotice(failure || `${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded. Save the product to publish.`)
    setUploading(false)
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice('')
    if (!images.length) { setNotice('Add at least one product image.'); return }
    setSaving(true)
    const response = await fetch('/api/admin', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, images, kind: 'product', id: editingId, price_ghs: Number(form.price_ghs), compare_at_price_ghs: form.compare_at_price_ghs ? Number(form.compare_at_price_ghs) : null, stock: Number(form.stock) }) })
    const result = await response.json(); setSaving(false)
    if (!response.ok) { setNotice(result.error || 'Could not save product.'); return }
    setNotice(editingId ? 'Product updated.' : 'Product added to the catalogue.'); setEditingId(null); setForm({ name: '', description: '', price_ghs: '', compare_at_price_ghs: '', category: 'Pantry', stock: '0', featured: false }); setImages([]); setImageUrlDraft(''); await mutate()
  }

  async function archiveProduct(id: string) {
    if (!window.confirm('Archive this product from the storefront?')) return
    const response = await fetch(`/api/admin?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) setNotice('Could not archive product.'); else { setNotice('Product archived.'); await mutate() }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header"><Link href="/" className="admin-back"><ArrowLeft size={16} /> Storefront</Link><Link href="/" className="brand" aria-label="Afro Superstore home"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-BntWL9FJ4tCF0xmRtGmE95PGUW6bZl.png" alt="" className="brand-logo" /></Link><nav className="admin-nav" aria-label="Admin sections"><Link href="/admin/shipping" className="admin-back">Shipping settings</Link><span className="admin-badge">ADMIN CONSOLE</span></nav></header>
      {isLoading ? <div className="admin-empty">Loading secure dashboard…</div> : error ? <section className="admin-denied"><ShieldAlert size={24} /><h1>Admin access required</h1><p>This area is restricted to store staff. Sign in with a staff account (owner, manager, fulfilment or content), then reload this page.</p><Link href="/" className="button-primary">Return to the store</Link></section> : data && <>
        <section className="admin-heading"><div><span className="eyebrow">AFRO SUPERSTORE GHANA</span><h1>Good morning, {data.me.role}.</h1><p>Signed in as {data.me.email}. Your store at a glance.</p></div><span className="admin-live"><i /> LIVE OVERVIEW</span></section>
        <section className="admin-metrics" aria-label="Store metrics">
          <article><span><CircleDollarSign size={16} /> Paid sales</span><strong>{money(data.metrics.revenue)}</strong><small>Confirmed payments</small></article>
          <article><span><PackageCheck size={16} /> Orders</span><strong>{data.metrics.orders}</strong><small>Latest 100 orders</small></article>
          <article><span><Users size={16} /> Customers</span><strong>{data.metrics.customers}</strong><small>Registered profiles</small></article>
          <article className={data.metrics.lowStock ? 'metric-warning' : ''}><span><Box size={16} /> Low stock</span><strong>{data.metrics.lowStock}</strong><small>5 units or fewer</small></article>
        </section>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        <div className="admin-grid">
          {data.me.permissions.includes('orders:read') && <section className="admin-panel admin-orders"><div className="admin-panel-heading"><div><h2>Recent orders</h2><p>Update order progress as parcels move.</p></div><span>{data.orders.length} shown</span></div>
            <div className="admin-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Total</th><th>Delivery status</th></tr></thead><tbody>{data.orders.map((order) => <tr key={order.id}><td><strong>{order.reference}</strong><small>{new Date(order.created_at).toLocaleDateString('en-GH')}</small></td><td>{order.shipping_details?.full_name || 'Customer'}<small>{order.shipping_details?.city || ''}</small></td><td><span className={`payment-pill ${order.payment_status === 'paid' ? 'is-paid' : ''}`}>{order.payment_status}</span></td><td>{money(Number(order.total_ghs))}</td><td><AdminOrderStatus key={`${order.id}-${order.status}-${order.tracking_number || ''}`} id={order.id} reference={order.reference} status={order.status} carrier={order.carrier} trackingNumber={order.tracking_number} onSaved={(message) => { setNotice(message); void mutate() }} /></td></tr>)}</tbody></table>{data.orders.length === 0 && <p className="admin-empty">Orders will appear here when customers check out.</p>}</div>
          </section>}
          {data.me.permissions.includes('products:write') && <section className="admin-panel admin-product-form"><div className="admin-panel-heading"><div><h2>Add a product</h2><p>Publish a new good to your storefront.</p></div><Plus size={17} /></div>
            <form className="admin-form" onSubmit={saveProduct}><label>Product name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Description<textarea required maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="admin-form-row"><label>Price (GH₵)<input type="number" min="0.01" step="0.01" required value={form.price_ghs} onChange={(event) => setForm({ ...form, price_ghs: event.target.value })} /></label><label>Compare price<input type="number" min="0.01" step="0.01" value={form.compare_at_price_ghs} onChange={(event) => setForm({ ...form, compare_at_price_ghs: event.target.value })} /></label></div><div className="admin-form-row"><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{[...new Set([...data.categories.filter((category) => category.active).map((category) => category.name), form.category])].map((name) => <option key={name}>{name}</option>)}</select></label><label>Stock<input type="number" min="0" step="1" required value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label></div><div className="admin-gallery-field"><span className="admin-gallery-label">Product images ({images.length}/{MAX_IMAGES})</span>{images.length > 0 && <ul className="admin-gallery" aria-label="Product images">{images.map((url, index) => <li key={url}><img src={url} alt={`Product image ${index + 1}`} />{index === 0 && <b className="admin-gallery-primary">Main</b>}<div className="admin-gallery-actions"><button type="button" aria-label={`Move image ${index + 1} earlier`} disabled={index === 0} onClick={() => moveImage(index, -1)}><ChevronLeft size={13} /></button><button type="button" aria-label={`Move image ${index + 1} later`} disabled={index === images.length - 1} onClick={() => moveImage(index, 1)}><ChevronRight size={13} /></button>{index > 0 && <button type="button" onClick={() => makePrimary(index)}>Main</button>}<button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => setImages((current) => current.filter((_, i) => i !== index))}><Trash2 size={13} /></button></div></li>)}</ul>}<label className="admin-upload-button"> <ImagePlus size={16} /> {uploading ? 'Uploading images…' : 'Upload images'}<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading || saving || images.length >= MAX_IMAGES} onChange={(event) => { const input = event.currentTarget; void uploadProductImages(input.files).finally(() => { input.value = '' }) }} /><span>Select several at once · JPG, PNG, WebP or AVIF · up to 4 MB each</span></label><div className="admin-gallery-url"><input type="url" aria-label="Image URL" placeholder="Or paste an HTTPS image link" value={imageUrlDraft} onChange={(event) => setImageUrlDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addImageUrl() } }} /><button type="button" onClick={addImageUrl}>Add link</button></div></div><label className="admin-checkbox"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Feature this product</label><div className="admin-form-actions"><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save product' : 'Publish product'} <Plus size={15} /></button>{editingId && <button type="button" className="admin-cancel" onClick={() => { setEditingId(null); setImages([]); setImageUrlDraft(''); setForm({ name: '', description: '', price_ghs: '', compare_at_price_ghs: '', category: 'Pantry', stock: '0', featured: false }) }}>Cancel edit</button>}</div></form>
          </section>}
          <section className="admin-panel admin-products"><div className="admin-panel-heading"><div><h2>Inventory</h2><p>Active catalogue and on-hand stock.</p></div><span>{data.products.filter((product) => product.active).length} active</span></div><div className="inventory-list">{data.products.map((product) => <article key={product.id} className={!product.active ? 'inventory-archived' : ''}><img src={product.image_url} alt="" /><div><strong>{product.name}</strong><span>{product.category} · {money(Number(product.price_ghs))}</span></div><b className={product.stock <= 5 ? 'stock-low' : ''}>{product.stock} in stock</b>{product.active && data.me.permissions.includes('products:write') && <div className="inventory-actions"><button onClick={() => { setEditingId(product.id); setImages(product.images?.length ? product.images : product.image_url ? [product.image_url] : []); setForm({ name: product.name, description: product.description, price_ghs: String(product.price_ghs), compare_at_price_ghs: product.compare_at_price_ghs ? String(product.compare_at_price_ghs) : '', category: product.category, stock: String(product.stock), featured: product.featured }) }}>Edit</button><button onClick={() => archiveProduct(product.id)}>Archive</button></div>}</article>)}</div></section>
          {data.me.permissions.includes('customers:read') && <section className="admin-panel admin-customers"><div className="admin-panel-heading"><div><h2>Customers</h2><p>Recently registered accounts.</p></div><Users size={17} /></div><div className="customer-list">{data.customers.map((customer) => <article key={customer.id}><span className="customer-avatar">{(customer.full_name || 'C').slice(0, 1).toUpperCase()}</span><div><strong>{customer.full_name || 'Customer'}</strong><small>Joined {new Date(customer.created_at).toLocaleDateString('en-GH')}</small></div></article>)}</div></section>}
          {data.me.permissions.includes('orders:read') && <AdminAnalyticsPanel />}
          {data.me.permissions.includes('products:write') && <AdminVariantsPanel products={data.products} onNotice={setNotice} />}
          {data.me.permissions.includes('products:read') && <AdminReviewsPanel canModerate={data.me.permissions.includes('products:write')} onNotice={setNotice} />}
          {data.me.permissions.includes('settings:write') && <AdminCouponsPanel onNotice={setNotice} />}
          {data.me.permissions.includes('products:write') && <AdminCategoriesPanel categories={data.categories} onChanged={() => void mutate()} onNotice={setNotice} />}
          {data.me.permissions.includes('staff:manage') && <AdminStaffPanel currentEmail={data.me.email} onNotice={setNotice} />}
          {data.me.permissions.includes('audit:read') && <AdminActivityPanel />}
        </div>
      </>}
    </main>
  )
}
