import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AccountSettings } from '@/components/account-settings'

export const metadata = { title: 'Account settings | Afro Superstore Ghana', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="account-page">
        <section className="account-page-card">
          <span className="eyebrow">AFRO SUPERSTORE GHANA</span>
          <h1>Sign in to manage your settings.</h1>
          <p>Your profile and password are available after you sign in.</p>
          <Link href="/" className="button-primary"><ArrowLeft size={15} /> Return to the store</Link>
        </section>
      </main>
    )
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const name = profile?.full_name || (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '')

  return (
    <main className="account-page">
      <header className="account-page-header">
        <Link href="/" className="brand" aria-label="Afro Superstore home">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-BntWL9FJ4tCF0xmRtGmE95PGUW6bZl.png" alt="" className="brand-logo" />
        </Link>
        <Link href="/account" className="account-page-back"><ArrowLeft size={15} /> My account</Link>
      </header>
      <section className="account-page-content">
        <span className="eyebrow">YOUR AFRO ACCOUNT</span>
        <h1>Settings</h1>
        <AccountSettings email={user.email ?? ''} initialName={name} />
      </section>
    </main>
  )
}
