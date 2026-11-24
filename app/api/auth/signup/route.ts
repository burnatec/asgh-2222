import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 100) : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: 'Please choose a password between 8 and 72 characters.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim().toLowerCase()
  if (!apiKey || !domain) {
    return NextResponse.json({ error: 'Email delivery is not configured yet. Please contact support.' }, { status: 503 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  // Do not reveal whether an address is already registered.
  if (error || !data?.properties?.hashed_token) {
    return NextResponse.json({ ok: true })
  }

  const link = `${request.nextUrl.origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=signup&next=/account`
  const name = escapeHtml(fullName || 'there')

  const { error: sendError } = await new Resend(apiKey).emails.send({
    from: `Afro Superstore <accounts@${domain}>`,
    to: [email],
    replyTo: 'afrosuperstoregh@gmail.com',
    subject: 'Confirm your Afro Superstore account',
    html: `<div style="margin:0;background:#f7f6f0;padding:36px 16px;font-family:Arial,sans-serif;color:#293a2b"><div style="max-width:560px;margin:0 auto;background:#fffefa;border:1px solid #e7e5dc;padding:32px"><p style="margin:0 0 20px;color:#75826c;font-size:12px;letter-spacing:2px;text-transform:uppercase">Afro Superstore Ghana</p><h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;font-weight:400">Welcome, ${name}.</h1><p style="margin:0 0 24px;color:#646b60;line-height:1.6">Confirm your email address to activate your account.</p><p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#293a2b;color:#fffefa;padding:14px 26px;text-decoration:none;font-weight:700">Confirm my account</a></p><p style="margin:0;color:#777d70;font-size:12px;line-height:1.6">If you did not create this account, you can ignore this email.</p></div></div>`,
    text: `Welcome to Afro Superstore Ghana. Confirm your account: ${link}\n\nIf you did not create this account, ignore this email.`,
  })

  if (sendError) {
    return NextResponse.json({ error: 'We could not send the confirmation email. Please try again shortly.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
