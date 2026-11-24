import { NextResponse } from 'next/server'
import { requireAdmin, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const denied = () => NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const bad = (error = 'Check the fields and try again.') => NextResponse.json({ error }, { status: 400 })

export async function GET() {
  if (!await requireAdmin()) return denied()
  try {
    const db = serviceClient()
    const [zones, methods, rates, pickups] = await Promise.all([
      db.from('shipping_zones').select('id,name,slug,regions,cities,is_fallback,active,free_shipping_threshold_ghs,min_order_ghs,sort_order').order('sort_order'),
      db.from('shipping_methods').select('id,code,name,description,min_days,max_days,unit,requires_pickup_location,active,sort_order').order('sort_order'),
      db.from('shipping_rates').select('id,zone_id,method_id,fee_ghs,active'),
      db.from('pickup_locations').select('id,name,address,city,region,phone,active').order('name'),
    ])
    if (zones.error || methods.error || rates.error || pickups.error) throw new Error('load failed')
    return NextResponse.json({ zones: zones.data, methods: methods.data, rates: rates.data, pickups: pickups.data })
  } catch {
    return NextResponse.json({ error: 'Shipping settings could not be loaded.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!await requireAdmin()) return denied()
  try {
    const body = await request.json() as Record<string, unknown>
    const db = serviceClient()

    if (body.kind === 'method') {
      const { min_days: min, max_days: max } = body
      if (!uuid(body.id) || !text(body.name, 80) || typeof body.description !== 'string' || body.description.length > 300
        || !Number.isInteger(min) || !Number.isInteger(max) || (min as number) < 0 || (max as number) < (min as number) || (max as number) > 60
        || !['hours', 'business_days'].includes(String(body.unit)) || typeof body.active !== 'boolean') return bad()
      const { error } = await db.from('shipping_methods').update({ name: String(body.name).trim(), description: body.description, min_days: min, max_days: max, unit: body.unit, active: body.active, updated_at: new Date().toISOString() }).eq('id', body.id)
      if (error) return bad('Could not update the method.')
      return NextResponse.json({ ok: true })
    }

    if (body.kind === 'zone') {
      const threshold = body.free_shipping_threshold_ghs
      if (!uuid(body.id) || !text(body.name, 80) || !money(body.min_order_ghs) || !(threshold === null || money(threshold)) || typeof body.active !== 'boolean') return bad()
      const { error } = await db.from('shipping_zones').update({ name: String(body.name).trim(), min_order_ghs: body.min_order_ghs, free_shipping_threshold_ghs: threshold, active: body.active, updated_at: new Date().toISOString() }).eq('id', body.id)
      if (error) return bad('Could not update the zone.')
      return NextResponse.json({ ok: true })
    }

    if (body.kind === 'rate') {
      if (!uuid(body.zone_id) || !uuid(body.method_id) || !money(body.fee_ghs) || typeof body.active !== 'boolean') return bad()
      const { error } = await db.from('shipping_rates').upsert({ zone_id: body.zone_id, method_id: body.method_id, fee_ghs: body.fee_ghs, active: body.active, updated_at: new Date().toISOString() }, { onConflict: 'zone_id,method_id' })
      if (error) return bad('Could not save the rate.')
      return NextResponse.json({ ok: true })
    }

    if (body.kind === 'pickup') {
      if (!uuid(body.id) || !text(body.name, 100) || !text(body.address, 200) || !text(body.city, 80) || !text(body.region, 80)
        || !(body.phone === null || body.phone === '' || text(body.phone, 30)) || typeof body.active !== 'boolean') return bad()
      const { error } = await db.from('pickup_locations').update({ name: String(body.name).trim(), address: String(body.address).trim(), city: String(body.city).trim(), region: String(body.region).trim(), phone: body.phone || null, active: body.active }).eq('id', body.id)
      if (error) return bad('Could not update the pickup location.')
      return NextResponse.json({ ok: true })
    }

    return bad('Invalid update.')
  } catch {
    return NextResponse.json({ error: 'Could not save the update.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return denied()
  try {
    const body = await request.json() as Record<string, unknown>
    if (!text(body.name, 100) || !text(body.address, 200) || !text(body.city, 80) || !text(body.region, 80) || !(body.phone === null || body.phone === undefined || body.phone === '' || text(body.phone, 30))) return bad()
    const { error } = await serviceClient().from('pickup_locations').insert({ name: String(body.name).trim(), address: String(body.address).trim(), city: String(body.city).trim(), region: String(body.region).trim(), phone: body.phone || null, active: true })
    if (error) return bad('Could not add the pickup location.')
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not add the pickup location.' }, { status: 500 })
  }
}
