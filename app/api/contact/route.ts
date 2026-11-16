import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Please check the form and try again.' }, { status: 400 })
    const data = body as Record<string, unknown>
    if (clean(data.website, 200)) return NextResponse.json({ ok: true })
    const name = clean(data.name, 120)
    const email = clean(data.email, 254)
    const phone = clean(data.phone, 40)
    const subject = clean(data.subject, 160)
    const message = clean(data.message, 3000)
    if (name.length < 2 || subject.length < 2 || message.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid name, email, subject and message.' }, { status: 400 })
    }
    const apiKey = process.env.RESEND_API_KEY
    const domain = process.env.RESEND_EMAIL_DOMAIN?.trim().toLowerCase()
    if (!apiKey || !domain || domain === 'gmail.com' || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
      return NextResponse.json({ error: 'Our contact form is temporarily unavailable. Please email us directly.' }, { status: 503 })
    }
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: `Afro Superstore <orders@${domain}>`, to: ['afrosuperstoregh@gmail.com'], replyTo: email,
      subject: `Website enquiry: ${subject}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#20251e"><h2>New website enquiry</h2><p><b>Name:</b> ${escapeHtml(name)}</p><p><b>Email:</b> ${escapeHtml(email)}</p><p><b>Phone:</b> ${escapeHtml(phone || 'Not provided')}</p><p><b>Subject:</b> ${escapeHtml(subject)}</p><p><b>Message:</b><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p></div>`,
      text: `New website enquiry\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\nSubject: ${subject}\n\n${message}`,
    })
    if (error) {
      console.error('[contact] Email delivery failed', { name: error.name })
      return NextResponse.json({ error: 'We could not send your message just now. Please try again or email us directly.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'We could not send your message just now. Please try again.' }, { status: 500 })
  }
}
