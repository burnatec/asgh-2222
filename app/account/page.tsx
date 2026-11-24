import Link from 'next/link'
import { ArrowLeft, PackageCheck } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AccountArea } from '@/components/account-area'

export const metadata = { title: 'Your Account | Afro Superstore Ghana', robots: { index: false, follow: false } }

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <main className="account-page"><section className="account-page-card"><span className="eyebrow">AFRO SUPERSTORE GHANA</span><h1>Sign in to your account.</h1><p>Your order history and profile details are available after you sign in.</p><Link href="/" className="button-primary"><ArrowLeft size={15} /> Return to the store</Link></section></main>

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()

  return <main className="account-page"><header className="account-page-header"><Link href="/" className="brand" aria-label="Afro Superstore home"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-BntWL9FJ4tCF0xmRtGmE95PGUW6bZl.png" alt="" className="brand-logo" /></Link><Link href="/" className="account-page-back"><ArrowLeft size={15} /> Storefront</Link></header><section className="account-page-content"><span className="eyebrow">YOUR AFRO ACCOUNT</span><h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ' back'}.</h1><div className="account-profile"><div><span>EMAIL</span><strong>{user.email}</strong></div><div><span>NAME</span><strong>{profile?.full_name || 'Add your name at your next checkout'}</strong></div></div><div className="account-orders-heading"><div><h2>Your orders and favourites</h2><p>A little something from Ghana, on its way.</p></div><PackageCheck size={19} /></div><AccountArea /></section></main>
}
