import { NextResponse } from 'next/server'
import { requireStaff, serviceClient, writeAudit, type Permission } from '@/lib/admin'

export const runtime = 'nodejs'

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const list = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 60 && value.every((v) => typeof v === 'string' && v.length <= 80)
const clean = (values: string[]) => [...new Map(values.map((v) => v.trim()).filter(Boolean).map((v) => [v.toLowerCase(), v])).values()]
const bad = (error = 'Check the fields and try again.') => NextResponse.json({ error }, { status: 400 })

async function guard(permission: Permission) {
  const result = await requireStaff(permission)
  return result.staff ? { staff: result.staff, response: null } : { staff: null, response: NextResponse.json({ error: result.error }, { status: result.status }) }
}

export async function GET() {
  const access = await guard('orders:read')
  if (access.response) return access.response
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
  const access = await guard('settings:write')
  if (access.response) return access.response
  try {
    const body = await request.json() as Record<string, unknown>
    const db = serviceClient()
    await writeAudit(access.staff, 'shipping.update', 'shipping', typeof body.id === 'string' ? body.id : null, { kind: body.kind })

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
      if (!uuid(body.id) || !text(body.name, 80) || !money(body.min_order_ghs) || !(threshold === null || money(threshold)) || typeof body.active !== 'boolean'
        || !list(body.cities) || !list(body.regions)) return bad()
      const { error } = await db.from('shipping_zones').update({ name: String(body.name).trim(), cities: clean(body.cities), regions: clean(body.regions), min_order_ghs: body.min_order_ghs, free_shipping_threshold_ghs: threshold, active: body.active, updated_at: new Date().toISOString() }).eq('id', body.id)
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

export async function DELETE(request: Request) {
  const access = await guard('settings:write')
  if (access.response) return access.response
  try {
    const body = await request.json() as Record<string, unknown>
    if (body.kind !== 'zone' || !uuid(body.id)) return bad()
    await writeAudit(access.staff, 'shipping.zone.delete', 'shipping_zone', body.id)
    const db = serviceClient()
    const { data: zone } = await db.from('shipping_zones').select('is_fallback').eq('id', body.id).maybeSingle()
    if (!zone) return bad('Zone not found.')
    if (zone.is_fallback) return bad('The catch-all zone cannot be removed. Deactivate it instead.')
    const { error } = await db.from('shipping_zones').delete().eq('id', body.id)
    if (error) return bad('This zone is used by existing orders and cannot be removed. Deactivate it instead.')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not remove the zone.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = await guard('settings:write')
  if (access.response) return access.response
  try {
    const body = await request.json() as Record<string, unknown>
    await writeAudit(access.staff, 'shipping.create', 'shipping', null, { kind: body.kind ?? 'pickup' })
    if (body.kind === 'zone') {
      if (!text(body.name, 80) || !list(body.cities) || !list(body.regions)) return bad()
      const name = String(body.name).trim()
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'zone'}-${Math.random().toString(36).slice(2, 6)}`
      const { error } = await serviceClient().from('shipping_zones').insert({ name, slug, cities: clean(body.cities), regions: clean(body.regions), is_fallback: false, active: true, sort_order: 100 })
      if (error) return bad('Could not add the zone.')
      return NextResponse.json({ ok: true }, { status: 201 })
    }
    if (!text(body.name, 100) || !text(body.address, 200) || !text(body.city, 80) || !text(body.region, 80) || !(body.phone === null || body.phone === undefined || body.phone === '' || text(body.phone, 30))) return bad()
    const { error } = await serviceClient().from('pickup_locations').insert({ name: String(body.name).trim(), address: String(body.address).trim(), city: String(body.city).trim(), region: String(body.region).trim(), phone: body.phone || null, active: true })
    if (error) return bad('Could not add the pickup location.')
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not add the pickup location.' }, { status: 500 })
  }
}
