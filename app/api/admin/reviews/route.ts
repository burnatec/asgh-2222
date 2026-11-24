import { NextResponse } from 'next/server'
import { requireStaff, serviceClient, writeAudit } from '@/lib/admin'

export const runtime = 'nodejs'

export async function GET() {
  const { staff, error, status } = await requireStaff('products:read')
  if (!staff) return NextResponse.json({ error }, { status })
  const { data, error: queryError } = await serviceClient().from('reviews').select('id,rating,title,body,author_name,status,verified_purchase,created_at,products(name)').order('created_at', { ascending: false }).limit(100)
  if (queryError) return NextResponse.json({ error: 'Could not load reviews.' }, { status: 500 })
  return NextResponse.json({ reviews: data ?? [] })
}

export async function PATCH(request: Request) {
  const { staff, error, status } = await requireStaff('products:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown } | null
  if (typeof body?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) || !['approved', 'hidden', 'pending'].includes(String(body.status))) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const { error: updateError } = await serviceClient().from('reviews').update({ status: body.status }).eq('id', body.id)
  if (updateError) return NextResponse.json({ error: 'Could not update the review.' }, { status: 500 })
  await writeAudit(staff, 'review.moderate', 'review', body.id, { status: body.status })
  return NextResponse.json({ ok: true })
}
