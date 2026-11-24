import { NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const DAYS = 30

export async function GET() {
  const { staff, error, status } = await requireStaff('orders:read')
  if (!staff) return NextResponse.json({ error }, { status })
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString()
  const admin = serviceClient()
  const [{ data: orders, error: ordersError }, { data: items }] = await Promise.all([
    admin.from('orders').select('id,status,payment_status,total_ghs,discount_ghs,created_at').gte('created_at', since).limit(5000),
    admin.from('order_items').select('product_name,quantity,unit_price_ghs,orders!inner(payment_status,created_at)').eq('orders.payment_status', 'paid').gte('orders.created_at', since).limit(10000),
  ])
  if (ordersError) return NextResponse.json({ error: 'Could not load analytics.' }, { status: 500 })

  const paid = (orders ?? []).filter((o) => o.payment_status === 'paid')
  const revenue = paid.reduce((sum, o) => sum + Number(o.total_ghs), 0)
  const daily = new Map<string, { revenue: number; orders: number }>()
  for (let i = DAYS - 1; i >= 0; i--) daily.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), { revenue: 0, orders: 0 })
  for (const order of paid) {
    const bucket = daily.get(order.created_at.slice(0, 10))
    if (bucket) { bucket.revenue += Number(order.total_ghs); bucket.orders += 1 }
  }
  const byProduct = new Map<string, { units: number; revenue: number }>()
  for (const item of items ?? []) {
    const row = byProduct.get(item.product_name) ?? { units: 0, revenue: 0 }
    row.units += item.quantity
    row.revenue += item.quantity * Number(item.unit_price_ghs)
    byProduct.set(item.product_name, row)
  }
  const statusCounts: Record<string, number> = {}
  for (const order of orders ?? []) statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1

  return NextResponse.json({
    days: DAYS,
    revenue,
    paidOrders: paid.length,
    totalOrders: orders?.length ?? 0,
    averageOrderValue: paid.length ? revenue / paid.length : 0,
    discounts: paid.reduce((sum, o) => sum + Number(o.discount_ghs ?? 0), 0),
    conversion: orders?.length ? paid.length / orders.length : 0,
    daily: [...daily.entries()].map(([date, v]) => ({ date, ...v })),
    topProducts: [...byProduct.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    statusCounts,
  })
}
