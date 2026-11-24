import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const serviceClient = () => {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const uuid = /^[0-9a-f-]{36}$/i

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const items = body?.items
    const city = typeof body?.city === 'string' ? body.city.trim().slice(0, 100) : ''
    const region = typeof body?.region === 'string' ? body.region.trim().slice(0, 100) : ''
    if (!Array.isArray(items) || !items.length || items.length > 20 || !city || !region) {
      return NextResponse.json({ options: [], pickup_locations: [] })
    }

    const quantities = new Map<string, number>()
    for (const item of items) {
      const value = item as Record<string, unknown>
      if (typeof value?.product_id !== 'string' || !uuid.test(value.product_id) || !Number.isInteger(value.quantity) || (value.quantity as number) < 1 || (value.quantity as number) > 20) {
        return NextResponse.json({ error: 'Invalid bag items.' }, { status: 400 })
      }
      quantities.set(value.product_id, value.quantity as number)
    }

    const admin = serviceClient()
    const { data: products } = await admin.from('products').select('id,price_ghs').in('id', [...quantities.keys()]).eq('active', true)
    const subtotal = (products ?? []).reduce((sum, product) => sum + Number(product.price_ghs) * (quantities.get(product.id) ?? 0), 0)

    const { data: options, error } = await admin.rpc('shipping_options', { p_city: city, p_region: region, p_subtotal: subtotal })
    if (error) return NextResponse.json({ error: 'Could not load delivery options.' }, { status: 500 })

    const { data: pickupLocations } = await admin
      .from('pickup_locations')
      .select('id,name,address,city')
      .eq('active', true)
      .ilike('region', region)

    return NextResponse.json({ subtotal, options: options ?? [], pickup_locations: pickupLocations ?? [] })
  } catch {
    return NextResponse.json({ error: 'Could not load delivery options.' }, { status: 500 })
  }
}
