import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view your orders.' }, { status: 401 })
  const { data, error } = await serviceClient()
    .from('orders')
    .select('id,reference,status,payment_status,total_ghs,discount_ghs,coupon_code,carrier,tracking_number,created_at,order_items(id,product_id,product_name,quantity,unit_price_ghs,image_url,variant_label)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: 'Could not load your orders.' }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}
