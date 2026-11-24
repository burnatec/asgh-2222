import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const auth = await createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to apply a coupon.' }, { status: 401 })

  const body = await request.json().catch(() => null) as { code?: unknown; subtotal?: unknown } | null
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase().slice(0, 40) : ''
  const subtotal = Number(body?.subtotal)
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) return NextResponse.json({ error: 'Enter a coupon code.' }, { status: 400 })

  const admin = serviceClient()
  const { data: coupon } = await admin.from('coupons').select('*').eq('code', code).eq('active', true).maybeSingle()
  const now = Date.now()
  if (!coupon || (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) || (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) || (coupon.max_uses != null && coupon.used_count >= coupon.max_uses)) {
    return NextResponse.json({ error: 'That coupon code is invalid or has expired.' }, { status: 422 })
  }
  if (subtotal < Number(coupon.min_subtotal_ghs)) {
    return NextResponse.json({ error: `Spend at least GH₵${Number(coupon.min_subtotal_ghs).toFixed(2)} to use this coupon.` }, { status: 422 })
  }
  const { count } = await admin.from('coupon_redemptions').select('id', { count: 'exact', head: true }).eq('coupon_id', coupon.id).eq('user_id', user.id)
  if ((count ?? 0) >= coupon.per_user_limit) return NextResponse.json({ error: 'You have already used that coupon.' }, { status: 422 })

  const raw = coupon.discount_type === 'percent' ? Math.round(subtotal * Number(coupon.value)) / 100 : Number(coupon.value)
  const discount = Math.min(subtotal, raw)
  return NextResponse.json({ code, discount, description: coupon.discount_type === 'percent' ? `${Number(coupon.value)}% off` : `GH₵${Number(coupon.value).toFixed(2)} off` })
}
