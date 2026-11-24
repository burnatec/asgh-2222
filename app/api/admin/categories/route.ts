import { NextResponse } from 'next/server'
import { requireStaff, serviceClient, writeAudit } from '@/lib/admin'

export const runtime = 'nodejs'

const slugify = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export async function POST(request: Request) {
  const { staff, error, status } = await requireStaff('products:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const body = await request.json().catch(() => null) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: 'Category name must be 2 to 60 characters.' }, { status: 400 })
  const admin = serviceClient()
  const { count } = await admin.from('categories').select('id', { count: 'exact', head: true })
  const { data, error: insertError } = await admin.from('categories').insert({ name, slug: slugify(name), sort_order: (count ?? 0) + 1 }).select('id').single()
  if (insertError) return NextResponse.json({ error: insertError.code === '23505' ? 'That category already exists.' : 'Could not add the category.' }, { status: insertError.code === '23505' ? 409 : 500 })
  await writeAudit(staff, 'category.create', 'category', data.id, { name })
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function DELETE(request: Request) {
  const { staff, error, status } = await requireStaff('products:write')
  if (!staff) return NextResponse.json({ error }, { status })
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
  const { error: updateError } = await serviceClient().from('categories').update({ active: false }).eq('id', id)
  if (updateError) return NextResponse.json({ error: 'Could not archive the category.' }, { status: 500 })
  await writeAudit(staff, 'category.archive', 'category', id)
  return NextResponse.json({ ok: true })
}
