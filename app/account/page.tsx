import Link from 'next/link'
import { ArrowLeft, PackageCheck } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = { title: 'Your Account | Afro Superstore Ghana', robots: { index: false, follow: false } }
const money = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(amount)

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <main className="account-page"><section className="account-page-card"><span className="eyebrow">AFRO SUPERSTORE GHANA</span><h1>Sign in to your account.</h1><p>Your order history and profile details are available after you sign in.</p><Link href="/" className="button-primary"><ArrowLeft size={15} /> Return to the store</Link></section></main>

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('orders').select('id,reference,status,payment_status,total_ghs,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ])

  return <main className="account-page"><header className="account-page-header"><Link href="/" className="brand" aria-label="Afro Superstore home"><span className="brand-mark">A<span>+</span></span><span>afro<span className="brand-light">superstore</span></span></Link><Link href="/" className="account-page-back"><ArrowLeft size={15} /> Storefront</Link></header><section className="account-page-content"><span className="eyebrow">YOUR AFRO ACCOUNT</span><h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ' back'}.</h1><div className="account-profile"><div><span>EMAIL</span><strong>{user.email}</strong></div><div><span>NAME</span><strong>{profile?.full_name || 'Add your name at your next checkout'}</strong></div></div><div className="account-orders-heading"><div><h2>Your orders</h2><p>A little something from Ghana, on its way.</p></div><PackageCheck size={19} /></div>{orders?.length ? <div className="account-order-list">{orders.map((order) => <article key={order.id}><div><strong>{order.reference}</strong><span>{new Date(order.created_at).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div><span className={`account-order-status ${order.payment_status === 'paid' ? 'paid' : ''}`}>{order.payment_status}</span><span className="account-order-delivery">{order.status}</span><strong>{money(Number(order.total_ghs))}</strong></article>)}</div> : <div className="account-no-orders"><PackageCheck size={24} /><p>No orders yet. Your next good find is waiting.</p><Link href="/#shop">Browse the collection</Link></div>}</section></main>
}
