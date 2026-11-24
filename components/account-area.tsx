'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Heart, PackageCheck } from 'lucide-react'

type OrderItem = { id: string; product_id: string; product_name: string; quantity: number; unit_price_ghs: number; image_url: string | null; variant_label: string | null }
type Order = { id: string; reference: string; status: string; payment_status: string; total_ghs: number; discount_ghs: number; coupon_code: string | null; carrier: string | null; tracking_number: string | null; created_at: string; order_items: OrderItem[] }
type WishItem = { product_id: string; products: { id: string; name: string; price_ghs: number; image_url: string; stock: number; active: boolean } | null }

const money = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(amount)
const fetcher = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error('Could not load.'); return response.json() }

export function AccountArea() {
  const [tab, setTab] = useState<'orders' | 'wishlist'>('orders')
  const orders = useSWR<{ orders: Order[] }>('/api/account/orders', fetcher)
  const wishlist = useSWR<{ items: WishItem[] }>('/api/wishlist', fetcher)

  async function removeSaved(productId: string) {
    await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' })
    void wishlist.mutate()
  }

  return (
    <>
      <div className="account-tabs" role="tablist" aria-label="Account sections">
        <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'tab-active' : ''} onClick={() => setTab('orders')}><PackageCheck size={15} /> Orders</button>
        <button role="tab" aria-selected={tab === 'wishlist'} className={tab === 'wishlist' ? 'tab-active' : ''} onClick={() => setTab('wishlist')}><Heart size={15} /> Wishlist ({wishlist.data?.items.length ?? 0})</button>
      </div>
      {tab === 'orders' && (orders.isLoading ? <p className="account-muted">Loading your orders…</p> : orders.data?.orders.length ? (
        <div className="account-order-list">
          {orders.data.orders.map((order) => (
            <article key={order.id} className="account-order-card">
              <div className="account-order-top">
                <div><strong>{order.reference}</strong><span>{new Date(order.created_at).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                <span className={`account-order-status ${order.payment_status === 'paid' ? 'paid' : ''}`}>{order.payment_status}</span>
                <span className="account-order-delivery">{order.status}</span>
                <strong>{money(Number(order.total_ghs))}</strong>
              </div>
              <ul className="account-order-items">
                {order.order_items.map((item) => <li key={item.id}>{item.image_url && <img src={item.image_url} alt="" />}<span>{item.product_name}{item.variant_label ? ` (${item.variant_label})` : ''} × {item.quantity}</span><b>{money(Number(item.unit_price_ghs) * item.quantity)}</b></li>)}
              </ul>
              <div className="account-order-foot">
                {Number(order.discount_ghs) > 0 && <small>Coupon {order.coupon_code}: -{money(Number(order.discount_ghs))}</small>}
                {order.tracking_number && <small>{order.carrier ? `${order.carrier}: ` : ''}{order.tracking_number}</small>}
                <Link href={`/track-order?reference=${encodeURIComponent(order.reference)}`}>Track order</Link>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="account-no-orders"><PackageCheck size={24} /><p>No orders yet. Your next good find is waiting.</p><Link href="/#shop">Browse the collection</Link></div>)}
      {tab === 'wishlist' && (wishlist.data?.items.length ? (
        <div className="wishlist-grid">
          {wishlist.data.items.filter((item) => item.products?.active).map((item) => (
            <article key={item.product_id} className="wishlist-card">
              <img src={item.products!.image_url} alt={item.products!.name} />
              <strong>{item.products!.name}</strong>
              <span>{money(Number(item.products!.price_ghs))}</span>
              <div><Link href="/#shop">View in shop</Link><button onClick={() => removeSaved(item.product_id)}>Remove</button></div>
            </article>
          ))}
        </div>
      ) : <div className="account-no-orders"><Heart size={24} /><p>Nothing saved yet. Tap the heart on any product.</p><Link href="/#shop">Browse the collection</Link></div>)}
    </>
  )
}
