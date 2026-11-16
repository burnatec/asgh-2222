'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    if (password !== confirmPassword) { setError('Those passwords do not match.'); return }
    setLoading(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (updateError) setError('This reset link may have expired. Request a new one and try again.')
    else setMessage('Your password has been updated. You can now sign in with your new password.')
  }

  return <main className="account-page"><header className="account-page-header"><Link href="/" className="brand" aria-label="Afro Superstore home"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-BntWL9FJ4tCF0xmRtGmE95PGUW6bZl.png" alt="" className="brand-logo" /></Link></header><section className="account-page-card reset-password-card"><span className="eyebrow">ACCOUNT SECURITY</span><h1>Choose a new password.</h1><p>Use at least 8 characters and keep it somewhere safe.</p><form className="account-form" onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}<button className="button-primary account-submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'} <ArrowRight size={15} /></button></form>{message && <Link href="/" className="reset-back">Return to the store</Link>}</section></main>
}
