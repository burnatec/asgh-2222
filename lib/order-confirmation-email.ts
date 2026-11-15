import { Resend } from 'resend'

type OrderConfirmationInput = {
  recipient: string
  reference: string
  totalGhs: number
  shipping: {
    full_name: string
    address: string
    city: string
    region: string
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

export async function sendOrderConfirmation(input: OrderConfirmationInput) {
  const apiKey = process.env.RESEND_API_KEY
  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim().toLowerCase()
  if (!apiKey || !domain || domain === 'gmail.com' || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new Error('Resend requires a verified sending domain; a free Gmail address cannot be used as the From domain.')
  }

  const name = escapeHtml(input.shipping.full_name)
  const address = escapeHtml([input.shipping.address, input.shipping.city, input.shipping.region].filter(Boolean).join(', '))
  const reference = escapeHtml(input.reference)
  const total = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(input.totalGhs)
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: `Afro Superstore <orders@${domain}>`,
    to: [input.recipient],
    bcc: ['afrosuperstoregh@gmail.com'],
    replyTo: 'afrosuperstoregh@gmail.com',
    subject: `Order ${input.reference} is confirmed`,
    html: `<div style="margin:0;background:#f7f6f0;padding:36px 16px;font-family:Arial,sans-serif;color:#293a2b"><div style="max-width:560px;margin:0 auto;background:#fffefa;border:1px solid #e7e5dc;padding:32px"><p style="margin:0 0 20px;color:#75826c;font-size:12px;letter-spacing:2px;text-transform:uppercase">Afro Superstore Ghana</p><h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:30px;font-weight:400">Thanks, ${name}.</h1><p style="margin:0 0 26px;color:#646b60;line-height:1.6">Your payment is confirmed and we’re preparing your order with care.</p><div style="border-top:1px solid #e7e5dc;border-bottom:1px solid #e7e5dc;padding:18px 0"><p style="margin:0 0 12px;color:#777d70;font-size:12px">ORDER REFERENCE</p><p style="margin:0 0 18px;font-weight:700">${reference}</p><p style="margin:0 0 6px;color:#777d70;font-size:12px">TOTAL PAID</p><p style="margin:0;font-size:18px;font-weight:700">${escapeHtml(total)}</p></div><p style="margin:22px 0 6px;color:#777d70;font-size:12px">DELIVERING TO</p><p style="margin:0;color:#414b40;line-height:1.6">${name}<br>${address}</p><p style="margin:28px 0 0;color:#646b60;font-size:13px;line-height:1.6">Questions? Reply to this email and our team will help.</p></div></div>`,
    text: `Thanks, ${input.shipping.full_name}. Your payment is confirmed and we’re preparing your order.\n\nOrder reference: ${input.reference}\nTotal paid: ${total}\nDelivering to: ${input.shipping.full_name}, ${input.shipping.address}, ${input.shipping.city}, ${input.shipping.region}\n\nQuestions? Reply to this email.`,
  }, { idempotencyKey: `order-confirmation-${input.reference}` })

  if (error) throw new Error(`Resend rejected the confirmation email: ${error.message}`)
}
