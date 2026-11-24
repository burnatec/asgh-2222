import { Resend } from 'resend'

export type NotifiableStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled'

type StatusEmailInput = {
  recipient: string
  reference: string
  status: NotifiableStatus
  customerName: string
  carrier?: string | null
  trackingNumber?: string | null
  note?: string | null
}

const copy: Record<NotifiableStatus, { subject: (ref: string) => string; heading: string; body: string }> = {
  processing: { subject: (ref) => `We're preparing order ${ref}`, heading: 'We are preparing your order.', body: 'Your payment is confirmed and our team is picking and packing your items.' },
  shipped: { subject: (ref) => `Order ${ref} is on its way`, heading: 'Your order has shipped.', body: 'Your parcel has left our store and is on its way to you.' },
  delivered: { subject: (ref) => `Order ${ref} was delivered`, heading: 'Your order was delivered.', body: 'We hope you enjoy your purchase. Thank you for shopping with us.' },
  cancelled: { subject: (ref) => `Order ${ref} was cancelled`, heading: 'Your order was cancelled.', body: 'If you paid, our team will contact you about your refund. Reply to this email with any questions.' },
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c)
}

export async function sendOrderStatusEmail(input: StatusEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim().toLowerCase()
  if (!apiKey || !domain || domain === 'gmail.com' || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new Error('Resend requires a verified sending domain.')
  }
  const text = copy[input.status]
  const name = escapeHtml(input.customerName || 'there')
  const detailRows: string[] = []
  if (input.status === 'shipped' && input.carrier) detailRows.push(`<p style="margin:0 0 4px;color:#777d70;font-size:12px">CARRIER</p><p style="margin:0 0 14px;font-weight:700">${escapeHtml(input.carrier)}</p>`)
  if (input.status === 'shipped' && input.trackingNumber) detailRows.push(`<p style="margin:0 0 4px;color:#777d70;font-size:12px">TRACKING NUMBER</p><p style="margin:0 0 14px;font-weight:700">${escapeHtml(input.trackingNumber)}</p>`)
  if (input.note) detailRows.push(`<p style="margin:0 0 4px;color:#777d70;font-size:12px">NOTE FROM OUR TEAM</p><p style="margin:0;color:#414b40;line-height:1.6">${escapeHtml(input.note)}</p>`)
  const baseUrl = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '')
  const trackLink = baseUrl ? `<p style="margin:24px 0 0"><a href="${escapeHtml(baseUrl)}/track-order" style="color:#293a2b;font-weight:700">Track your order</a></p>` : ''

  const { error } = await new Resend(apiKey).emails.send({
    from: `Afro Superstore <orders@${domain}>`,
    to: [input.recipient],
    replyTo: 'afrosuperstoregh@gmail.com',
    subject: text.subject(input.reference),
    html: `<div style="margin:0;background:#f7f6f0;padding:36px 16px;font-family:Arial,sans-serif;color:#293a2b"><div style="max-width:560px;margin:0 auto;background:#fffefa;border:1px solid #e7e5dc;padding:32px"><p style="margin:0 0 20px;color:#75826c;font-size:12px;letter-spacing:2px;text-transform:uppercase">Afro Superstore Ghana</p><h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;font-weight:400">${text.heading}</h1><p style="margin:0 0 22px;color:#646b60;line-height:1.6">Hi ${name}, ${escapeHtml(text.body)}</p><div style="border-top:1px solid #e7e5dc;border-bottom:1px solid #e7e5dc;padding:18px 0"><p style="margin:0 0 4px;color:#777d70;font-size:12px">ORDER REFERENCE</p><p style="margin:0 0 14px;font-weight:700">${escapeHtml(input.reference)}</p>${detailRows.join('')}</div>${trackLink}<p style="margin:24px 0 0;color:#646b60;font-size:13px;line-height:1.6">Questions? Reply to this email and our team will help.</p></div></div>`,
    text: `Hi ${input.customerName || 'there'}, ${text.body}\n\nOrder reference: ${input.reference}${input.status === 'shipped' && input.carrier ? `\nCarrier: ${input.carrier}` : ''}${input.status === 'shipped' && input.trackingNumber ? `\nTracking number: ${input.trackingNumber}` : ''}${input.note ? `\nNote: ${input.note}` : ''}\n\nQuestions? Reply to this email.`,
  })
  if (error) throw new Error(`Resend rejected the status email: ${error.message}`)
}
