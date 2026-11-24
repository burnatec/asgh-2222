import { NextResponse } from 'next/server'
import { requireStaff, serviceClient, writeAudit } from '@/lib/admin'

export const runtime = 'nodejs'

export async function GET() {
  const { staff, error, status } = await requireStaff('settings:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const { data, error: queryError } = await serviceClient().from('coupons').select('*').order('created_at', { ascending: false }).limit(100)
  if (queryError) return NextResponse.json({ error: 'Could not load coupons.' }, { status: 500 })
  return NextResponse.json({ coupons: data ?? [] })
}

export async function POST(request: Request) {
  const { staff, error, status } = await requireStaff('settings:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const type = body?.discount_type
  const value = Number(body?.value)
  const min = Number(body?.min_subtotal_ghs ?? 0)
  const maxUses = body?.max_uses === '' || body?.max_uses == null ? null : Number(body.max_uses)
  const perUser = Number(body?.per_user_limit ?? 1)
  const expires = typeof body?.expires_at === 'string' && body.expires_at ? new Date(body.expires_at) : null
  if (!/^[A-Z0-9_-]{3,30}$/.test(code) || (type !== 'percent' && type !== 'fixed') || !Number.isFinite(value) || value <= 0 || (type === 'percent' && value > 100)
    || !Number.isFinite(min) || min < 0 || (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) || !Number.isInteger(perUser) || perUser < 1 || (expires && Number.isNaN(expires.getTime()))) {
    return NextResponse.json({ error: 'Check the coupon code (3-30 letters/numbers), type, value and limits.' }, { status: 400 })
  }
  const { data, error: insertError } = await serviceClient().from('coupons').insert({
    code, discount_type: type, value, min_subtotal_ghs: min, max_uses: maxUses, per_user_limit: perUser, expires_at: expires?.toISOString() ?? null,
  }).select('id').single()
  if (insertError) return NextResponse.json({ error: insertError.code === '23505' ? 'That coupon code already exists.' : 'Could not create the coupon.' }, { status: insertError.code === '23505' ? 409 : 500 })
  await writeAudit(staff, 'coupon.create', 'coupon', data.id, { code, type, value })
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { staff, error, status } = await requireStaff('settings:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const body = await request.json().catch(() => null) as { id?: unknown; active?: unknown } | null
  if (typeof body?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.active !== 'boolean') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const { error: updateError } = await serviceClient().from('coupons').update({ active: body.active }).eq('id', body.id)
  if (updateError) return NextResponse.json({ error: 'Could not update the coupon.' }, { status: 500 })
  await writeAudit(staff, body.active ? 'coupon.enable' : 'coupon.disable', 'coupon', body.id)
  return NextResponse.json({ ok: true })
}
