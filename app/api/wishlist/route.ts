import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f-]{36}$/i

async function currentUser() {
  const auth = await createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  return user
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ items: [] })
  const { data, error } = await serviceClient().from('wishlist_items').select('product_id, created_at, products(id,name,price_ghs,image_url,stock,active)').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Could not load your wishlist.' }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save items.' }, { status: 401 })
  const body = await request.json().catch(() => null) as { productId?: unknown } | null
  if (typeof body?.productId !== 'string' || !UUID.test(body.productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
  const { error } = await serviceClient().from('wishlist_items').upsert({ user_id: user.id, product_id: body.productId }, { onConflict: 'user_id,product_id' })
  if (error) return NextResponse.json({ error: 'Could not save that item.' }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const productId = new URL(request.url).searchParams.get('productId')
  if (!productId || !UUID.test(productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
  const { error } = await serviceClient().from('wishlist_items').delete().eq('user_id', user.id).eq('product_id', productId)
  if (error) return NextResponse.json({ error: 'Could not remove that item.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
