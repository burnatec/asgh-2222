'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'sign-in' | 'sign-up' | 'reset'

export function AccountModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const supabase = createClient()
    const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`

    try {
      if (mode === 'sign-up') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim() }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(result.error ?? 'We could not create your account with those details. Please check and try again.')
          return
        }
        setMessage('Check your inbox (and spam folder) for a link to confirm your account.')
      } else if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${redirectTo}?next=/auth/reset-password` })
        if (authError) setError('We could not send a reset link right now. Please try again later.')
        else setMessage('If an account exists for that address, a password reset link is on its way.')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) {
          if (authError.code === 'email_not_confirmed') {
            setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.')
          } else if (authError.status === 429 || authError.code === 'over_request_rate_limit') {
            setError('Too many sign-in attempts. Please wait a moment and try again.')
          } else if (authError.code === 'invalid_credentials' || authError.status === 400) {
            setError('Invalid email or password. Please try again.')
          } else {
            setError('We could not sign you in right now. Please try again later.')
          }
        } else {
          setSignedIn(true)
          setMessage('You’re signed in. Your orders and account details are ready.')
        }
      }
    } catch {
      setError('Something went wrong. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'sign-in' ? 'Welcome back.' : mode === 'sign-up' ? 'Come on in.' : 'A fresh start.'

  return (
    <div className="overlay account-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button className="icon-button account-close" aria-label="Close account window" onClick={onClose}><X size={19} /></button>
        <span className="eyebrow">AFRO SUPERSTORE GHANA</span>
        <h2 id="account-title">{title}</h2>
        <p className="account-intro">{mode === 'sign-in' ? 'Your favourite Ghanaian finds are just a sign-in away.' : mode === 'sign-up' ? 'Create your account and keep all your good things together.' : 'We’ll send you a secure link to reset your password.'}</p>
        <form className="account-form" onSubmit={submit}>
          {mode === 'sign-up' && <label>Your name<input autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ama Mensah" /></label>}
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          {mode !== 'reset' && <label>Password<span className="password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="button-primary account-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'} <ArrowRight size={15} /></button>
        </form>
        {mode === 'sign-in' && <button className="account-text-button reset-link" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Forgot your password?</button>}
        {signedIn && <Link className="account-text-button account-orders-link" href="/account" onClick={onClose}>View my account and orders <ArrowRight size={13} /></Link>}
        <div className="account-switch">{mode === 'sign-in' ? <>New to Afro? <button onClick={() => { setMode('sign-up'); setError(''); setMessage('') }}>Create an account</button></> : <>Already have an account? <button onClick={() => { setMode('sign-in'); setError(''); setMessage('') }}>Sign in</button></>}</div>
      </section>
    </div>
  )
}
