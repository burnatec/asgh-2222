import { NextResponse } from 'next/server'
import { sendOrderStatusEmail } from '@/lib/order-status-email'
import { can, getStaff, requireStaff, serviceClient, writeAudit, type Permission } from '@/lib/admin'

export const runtime = 'nodejs'

async function guard(permission: Permission) {
  const result = await requireStaff(permission)
  return result.staff ? { staff: result.staff, response: null } : { staff: null, response: NextResponse.json({ error: result.error }, { status: result.status }) }
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
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  try {
    const admin = serviceClient()
    const empty = Promise.resolve({ data: [] as never[], error: null })
    const [productsResult, ordersResult, customersResult, categoriesResult] = await Promise.all([
      can(staff.role, 'products:read') ? admin.from('products').select('id,name,slug,description,price_ghs,compare_at_price_ghs,image_url,category,stock,featured,active,created_at').order('created_at', { ascending: false }).limit(100) : empty,
      can(staff.role, 'orders:read') ? admin.from('orders').select('id,reference,user_id,status,payment_status,total_ghs,created_at,shipping_details,carrier,tracking_number,shipping_method_name').order('created_at', { ascending: false }).limit(100) : empty,
      can(staff.role, 'customers:read') ? admin.from('profiles').select('id,full_name,created_at').order('created_at', { ascending: false }).limit(100) : empty,
      admin.from('categories').select('id,name,slug,sort_order,active').order('sort_order'),
    ])
    if (productsResult.error || ordersResult.error || customersResult.error) throw new Error('Dashboard data could not be loaded')
    const orders = ordersResult.data as { payment_status: string; total_ghs: number | string }[]
    const products = productsResult.data as { active: boolean; stock: number }[]
    const paidRevenue = can(staff.role, 'customers:read') ? orders.filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + Number(order.total_ghs), 0) : 0
    return NextResponse.json({
      me: { email: staff.email, role: staff.role, permissions: staff.permissions },
      products: productsResult.data,
      orders: ordersResult.data,
      customers: customersResult.data,
      categories: categoriesResult.data ?? [],
      metrics: { revenue: paidRevenue, orders: orders.length, customers: customersResult.data?.length ?? 0, lowStock: products.filter((product) => product.active && product.stock <= 5).length },
    })
  } catch {
    return NextResponse.json({ error: 'Dashboard data could not be loaded.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { staff, response } = await guard('products:write')
  if (!staff) return response
  try {
    const data: unknown = await request.json()
    if (!data || typeof data !== 'object' || !validProduct(data as Record<string, unknown>)) return NextResponse.json({ error: 'Check the product fields and try again.' }, { status: 400 })
    const product = data as Record<string, unknown>
    const name = String(product.name).trim()
    const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data: created, error } = await serviceClient().from('products').insert({
      name,
      slug,
      description: String(product.description),
      price_ghs: Number(product.price_ghs),
      compare_at_price_ghs: product.compare_at_price_ghs ?? null,
      image_url: String(product.image_url),
      category: String(product.category),
      stock: Number(product.stock),
      featured: product.featured === true,
      active: true,
    }).select('id').single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'A product with this name is already in the catalogue.' }, { status: 409 })
      console.error('[admin] Product insert failed', { code: error.code, message: error.message })
      return NextResponse.json({ error: 'Could not add this product. Please try again.' }, { status: 500 })
    }
    if (Number(product.stock) > 0) await serviceClient().from('inventory_logs').insert({ product_id: created.id, delta: Number(product.stock), stock_after: Number(product.stock), reason: 'Initial stock', actor_id: staff.id })
    await writeAudit(staff, 'product.create', 'product', created.id, { name, stock: Number(product.stock) })
    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not add this product.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  try {
    const data: unknown = await request.json()
    if (!data || typeof data !== 'object') return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
    const body = data as Record<string, unknown>
    const admin = serviceClient()
    if (body.kind === 'order' && !can(staff.role, 'orders:write')) return NextResponse.json({ error: 'Your role does not allow updating orders.' }, { status: 403 })
    if (body.kind === 'product' && !can(staff.role, 'products:write')) return NextResponse.json({ error: 'Your role does not allow editing products.' }, { status: 403 })
    if (body.kind === 'order' && typeof body.id === 'string' && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(String(body.status))) {
      const status = String(body.status) as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
      const clean = (value: unknown, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
      const carrier = clean(body.carrier, 80)
      const trackingNumber = clean(body.tracking_number, 120)
      const note = clean(body.note, 500)
      const notify = body.notify !== false
      const { data: existing, error: lookupError } = await admin.from('orders').select('id,reference,user_id,status,shipping_details,carrier,tracking_number').eq('id', body.id).maybeSingle()
      if (lookupError || !existing) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
      const update: Record<string, unknown> = { status }
      if (carrier !== null) update.carrier = carrier
      if (trackingNumber !== null) update.tracking_number = trackingNumber
      if (status === 'shipped' && existing.status !== 'shipped') update.shipped_at = new Date().toISOString()
      if (status === 'delivered' && existing.status !== 'delivered') update.delivered_at = new Date().toISOString()
      const { error } = await admin.from('orders').update(update).eq('id', body.id)
      if (error) return NextResponse.json({ error: 'Could not update the order.' }, { status: 400 })

      let notified = false
      let emailWarning = ''
      if (notify && status !== 'pending') {
        try {
          const { data: { user } } = await admin.auth.admin.getUserById(existing.user_id)
          const details = existing.shipping_details && typeof existing.shipping_details === 'object' ? existing.shipping_details as Record<string, unknown> : {}
          if (!user?.email) throw new Error('Customer has no email address.')
          await sendOrderStatusEmail({
            recipient: user.email,
            reference: existing.reference,
            status,
            customerName: typeof details.full_name === 'string' ? details.full_name : '',
            carrier: carrier ?? existing.carrier,
            trackingNumber: trackingNumber ?? existing.tracking_number,
            note,
          })
          notified = true
        } catch (emailError) {
          console.error('[admin] Status email failed', { message: emailError instanceof Error ? emailError.message : 'unknown' })
          emailWarning = 'Status saved, but the customer email could not be sent.'
        }
      }
      await admin.from('order_events').insert({ order_id: body.id, status, note, notified })
      await writeAudit(staff, 'order.status', 'order', existing.reference, { from: existing.status, to: status, carrier, trackingNumber, notified })
      return NextResponse.json({ ok: true, notified, warning: emailWarning || undefined })
    }
    if (body.kind === 'product' && typeof body.id === 'string' && validProduct(body)) {
      const { id: _id, kind: _kind, ...fields } = body
      const slug = String(fields.name).trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { data: before } = await admin.from('products').select('stock,price_ghs,active').eq('id', body.id).maybeSingle()
      const { error } = await admin.from('products').update({ ...fields, slug }).eq('id', body.id)
      if (error) return NextResponse.json({ error: 'Could not update the product.' }, { status: 400 })
      const newStock = Number(fields.stock)
      if (before && before.stock !== newStock) await admin.from('inventory_logs').insert({ product_id: body.id, delta: newStock - before.stock, stock_after: newStock, reason: 'Manual adjustment', actor_id: staff.id })
      await writeAudit(staff, 'product.update', 'product', body.id, { name: fields.name, price_before: before?.price_ghs, price_after: fields.price_ghs, stock_before: before?.stock, stock_after: newStock })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Could not save the update.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { staff, response } = await guard('products:write')
  if (!staff) return response
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
  const { error } = await serviceClient().from('products').update({ active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not archive this product.' }, { status: 400 })
  await writeAudit(staff, 'product.archive', 'product', id)
  return NextResponse.json({ ok: true })
}
