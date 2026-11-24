import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmation } from '@/lib/order-confirmation-email'

export type PaymentOutcome = 'paid' | 'pending' | 'failed'

export function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * The live key (PAYSTACK_SECRET_KEY) always wins. A test key is only honoured
 * outside production, so a leftover PAYSTACK_TEST_SECRET_KEY can never
 * silently divert real customer payments into Paystack test mode.
 */
export function getPaystackSecret(): string | null {
  const live = process.env.PAYSTACK_SECRET_KEY?.trim()
  const test = process.env.PAYSTACK_TEST_SECRET_KEY?.trim()
  const isProduction = process.env.VERCEL_ENV === 'production'
  const secret = isProduction ? live : live || test
  if (!secret) return null
  if (isProduction && !secret.startsWith('sk_live_')) {
    console.error('[payments] PAYSTACK_SECRET_KEY is not a live key (sk_live_...). Live payments cannot succeed.')
    return null
  }
  return secret
}

export async function finalizeOrderPayment(reference: string, secret: string): Promise<PaymentOutcome> {
  const admin = adminClient()
  const { data: order } = await admin
    .from('orders')
    .select('id,reference,total_ghs,payment_status,user_id,shipping_details')
    .eq('reference', reference)
    .maybeSingle()
  if (!order) return 'failed'
  if (order.payment_status === 'paid') return 'paid'

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.status) return 'pending'

  const providerStatus: string | undefined = result.data?.status
  if (providerStatus !== 'success') {
    return providerStatus === 'failed' || providerStatus === 'abandoned' || providerStatus === 'reversed' ? 'failed' : 'pending'
  }

  const expectedAmount = Math.round(Number(order.total_ghs) * 100)
  if (result.data?.currency !== 'GHS' || result.data?.reference !== reference || result.data?.amount !== expectedAmount) {
    console.error('[payments] Paid transaction does not match order', { reference })
    return 'failed'
  }

  const { data: paidOrder, error } = await admin
    .from('orders')
    .update({ payment_status: 'paid', status: 'processing', payment_reference: reference })
    .eq('id', order.id)
    .eq('payment_status', 'pending')
    .select('id')
    .maybeSingle()
  if (error) return 'pending'

  if (paidOrder) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(order.user_id)
      const shipping = order.shipping_details && typeof order.shipping_details === 'object' ? order.shipping_details as Record<string, unknown> : {}
      if (user?.email) {
        await sendOrderConfirmation({
          recipient: user.email,
          reference: order.reference,
          totalGhs: Number(order.total_ghs),
          shipping: {
            full_name: typeof shipping.full_name === 'string' ? shipping.full_name : 'there',
            address: typeof shipping.address === 'string' ? shipping.address : '',
            city: typeof shipping.city === 'string' ? shipping.city : '',
            region: typeof shipping.region === 'string' ? shipping.region : '',
          },
        })
      }
    } catch (emailError) {
      console.error('[payments] Order confirmation email failed:', emailError)
    }
  }
  return 'paid'
}
