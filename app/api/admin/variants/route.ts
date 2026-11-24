import { NextResponse } from 'next/server'
import { requireStaff, serviceClient, writeAudit } from '@/lib/admin'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f-]{36}$/i

export async function GET(request: Request) {
  const { staff, error, status } = await requireStaff('products:read')
  if (!staff) return NextResponse.json({ error }, { status })
  const productId = new URL(request.url).searchParams.get('productId')
  if (!productId || !UUID.test(productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
  const { data, error: queryError } = await serviceClient().from('product_variants').select('*').eq('product_id', productId).order('sort_order')
  if (queryError) return NextResponse.json({ error: 'Could not load variants.' }, { status: 500 })
  return NextResponse.json({ variants: data ?? [] })
}

export async function POST(request: Request) {
  const { staff, error, status } = await requireStaff('products:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const label = typeof body?.label === 'string' ? body.label.trim() : ''
  const stock = Number(body?.stock)
  const price = body?.price_ghs === '' || body?.price_ghs == null ? null : Number(body.price_ghs)
  if (typeof body?.product_id !== 'string' || !UUID.test(body.product_id) || label.length < 1 || label.length > 60 || !Number.isInteger(stock) || stock < 0 || (price !== null && (!Number.isFinite(price) || price < 0))) {
    return NextResponse.json({ error: 'Enter a label, stock count and optional price.' }, { status: 400 })
  }
  const sku = typeof body.sku === 'string' && body.sku.trim() ? body.sku.trim().slice(0, 60) : null
  const { data, error: insertError } = await serviceClient().from('product_variants').insert({ product_id: body.product_id, label, sku, price_ghs: price, stock }).select('id').single()
  if (insertError) return NextResponse.json({ error: insertError.code === '23505' ? 'That option already exists.' : 'Could not add the variant.' }, { status: insertError.code === '23505' ? 409 : 500 })
  await writeAudit(staff, 'variant.create', 'variant', data.id, { label, stock })
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { staff, error, status } = await requireStaff('products:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (typeof body?.id !== 'string' || !UUID.test(body.id)) return NextResponse.json({ error: 'Invalid variant.' }, { status: 400 })
  const update: Record<string, unknown> = {}
  if (body.stock !== undefined) {
    const stock = Number(body.stock)
    if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: 'Stock must be zero or more.' }, { status: 400 })
    update.stock = stock
  }
  if (typeof body.active === 'boolean') update.active = body.active
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  const { error: updateError } = await serviceClient().from('product_variants').update(update).eq('id', body.id)
  if (updateError) return NextResponse.json({ error: 'Could not update the variant.' }, { status: 500 })
  await writeAudit(staff, 'variant.update', 'variant', body.id, update)
  return NextResponse.json({ ok: true })
}
