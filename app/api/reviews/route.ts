import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f-]{36}$/i

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('productId')
  if (!productId || !UUID.test(productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
  const { data, error } = await serviceClient().from('reviews').select('id,author_name,rating,title,body,verified_purchase,created_at').eq('product_id', productId).eq('status', 'approved').order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'Could not load reviews.' }, { status: 500 })
  const reviews = data ?? []
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  return NextResponse.json({ reviews, average: Math.round(average * 10) / 10, count: reviews.length })
}

export async function POST(request: Request) {
  const auth = await createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to write a review.' }, { status: 401 })

  const body = await request.json().catch(() => null) as { productId?: unknown; rating?: unknown; title?: unknown; body?: unknown } | null
  const rating = Number(body?.rating)
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : null
  if (typeof body?.productId !== 'string' || !UUID.test(body.productId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 5 || text.length > 2000) {
    return NextResponse.json({ error: 'Add a star rating and a review of at least 5 characters.' }, { status: 400 })
  }

  const admin = serviceClient()
  const { data: purchased } = await admin.from('order_items').select('id, orders!inner(user_id,payment_status)').eq('product_id', body.productId).eq('orders.user_id', user.id).eq('orders.payment_status', 'paid').limit(1)
  const name = (user.user_metadata?.full_name as string | undefined)?.trim() || user.email?.split('@')[0] || 'Customer'

  const { error } = await admin.from('reviews').insert({
    product_id: body.productId, user_id: user.id, author_name: name.slice(0, 60), rating, title, body: text,
    verified_purchase: Boolean(purchased?.length), status: 'pending',
  })
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'You have already reviewed this product.' : 'Could not save your review.' }, { status: error.code === '23505' ? 409 : 500 })
  return NextResponse.json({ ok: true, message: 'Thanks. Your review will appear once approved.' }, { status: 201 })
}
