import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function serviceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireAdmin() {
  const auth = await createServerSupabaseClient()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user || user.app_metadata?.role !== 'admin') return null
  return user
}

function validProduct(data: Record<string, unknown>) {
  return typeof data.name === 'string' && data.name.trim().length > 1 && data.name.length <= 120
    && typeof data.description === 'string' && data.description.length <= 2000
    && typeof data.price_ghs === 'number' && Number.isFinite(data.price_ghs) && data.price_ghs > 0 && data.price_ghs <= 100000
    && (data.compare_at_price_ghs === null || data.compare_at_price_ghs === undefined || (typeof data.compare_at_price_ghs === 'number' && data.compare_at_price_ghs > data.price_ghs))
    && typeof data.image_url === 'string' && data.image_url.startsWith('https://') && data.image_url.length <= 1000
    && typeof data.category === 'string' && data.category.length <= 60
    && Number.isInteger(data.stock) && (data.stock as number) >= 0 && (data.stock as number) <= 100000
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  try {
    const admin = serviceClient()
    const [productsResult, ordersResult, customersResult] = await Promise.all([
      admin.from('products').select('id,name,slug,description,price_ghs,compare_at_price_ghs,image_url,category,stock,featured,active,created_at').order('created_at', { ascending: false }).limit(100),
      admin.from('orders').select('id,reference,user_id,status,payment_status,total_ghs,created_at,shipping_details').order('created_at', { ascending: false }).limit(100),
      admin.from('profiles').select('id,full_name,created_at').order('created_at', { ascending: false }).limit(100),
    ])
    if (productsResult.error || ordersResult.error || customersResult.error) throw new Error('Dashboard data could not be loaded')
    const paidRevenue = (ordersResult.data || []).filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + Number(order.total_ghs), 0)
    return NextResponse.json({ products: productsResult.data, orders: ordersResult.data, customers: customersResult.data, metrics: { revenue: paidRevenue, orders: ordersResult.data?.length ?? 0, customers: customersResult.data?.length ?? 0, lowStock: productsResult.data?.filter((product) => product.active && product.stock <= 5).length ?? 0 } })
  } catch {
    return NextResponse.json({ error: 'Dashboard data could not be loaded.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  try {
    const data: unknown = await request.json()
    if (!data || typeof data !== 'object' || !validProduct(data as Record<string, unknown>)) return NextResponse.json({ error: 'Check the product fields and try again.' }, { status: 400 })
    const product = data as Record<string, unknown>
    const slug = String(product.name).trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data: created, error } = await serviceClient().from('products').insert({ ...product, name: String(product.name).trim(), slug, featured: product.featured === true, active: true }).select('id').single()
    if (error) return NextResponse.json({ error: 'Could not add this product. The name may already be in use.' }, { status: 409 })
    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not add this product.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  try {
    const data: unknown = await request.json()
    if (!data || typeof data !== 'object') return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
    const body = data as Record<string, unknown>
    const admin = serviceClient()
    if (body.kind === 'order' && typeof body.id === 'string' && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(String(body.status))) {
      const { error } = await admin.from('orders').update({ status: body.status }).eq('id', body.id)
      if (error) return NextResponse.json({ error: 'Could not update the order.' }, { status: 400 })
      return NextResponse.json({ ok: true })
    }
    if (body.kind === 'product' && typeof body.id === 'string' && validProduct(body)) {
      const { id: _id, kind: _kind, ...fields } = body
      const slug = String(fields.name).trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { error } = await admin.from('products').update({ ...fields, slug }).eq('id', body.id)
      if (error) return NextResponse.json({ error: 'Could not update the product.' }, { status: 400 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Could not save the update.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
  const { error } = await serviceClient().from('products').update({ active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not archive this product.' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
