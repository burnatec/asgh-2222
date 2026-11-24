import { NextResponse } from 'next/server'
import { requireStaff, serviceClient, STAFF_ROLES, writeAudit, type StaffRole } from '@/lib/admin'

export const runtime = 'nodejs'

const denied = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function GET() {
  const { staff, error, status } = await requireStaff('staff:manage')
  if (!staff) return denied(error, status)
  const admin = serviceClient()
  const { data: roles, error: rolesError } = await admin.from('staff_roles').select('user_id,role,created_at').order('created_at')
  if (rolesError) return denied('Could not load staff.', 500)
  const members = await Promise.all((roles || []).map(async (row) => {
    const { data } = await admin.auth.admin.getUserById(row.user_id)
    return { user_id: row.user_id, role: row.role, email: data.user?.email ?? 'Unknown', created_at: row.created_at }
  }))
  return NextResponse.json({ members })
}

export async function POST(request: Request) {
  const { staff, error, status } = await requireStaff('staff:manage')
  if (!staff) return denied(error, status)
  const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = body?.role as StaffRole
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !STAFF_ROLES.includes(role)) return denied('Enter a valid email and role.', 400)
  const admin = serviceClient()
  let userId: string | null = null
  for (let page = 1; page <= 10 && !userId; page++) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (listError) return denied('Could not look up that user.', 500)
    userId = data.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null
    if (data.users.length < 200) break
  }
  if (!userId) return denied('No account exists for that email. Ask them to sign up first.', 404)
  const { error: upsertError } = await admin.from('staff_roles').upsert({ user_id: userId, role, created_by: staff.id })
  if (upsertError) return denied('Could not save this role.', 500)
  await writeAudit(staff, 'staff.assign', 'staff', userId, { email, role })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { staff, error, status } = await requireStaff('staff:manage')
  if (!staff) return denied(error, status)
  const userId = new URL(request.url).searchParams.get('user_id')
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return denied('Invalid user.', 400)
  if (userId === staff.id) return denied('You cannot remove your own access.', 400)
  const { error: deleteError } = await serviceClient().from('staff_roles').delete().eq('user_id', userId)
  if (deleteError) return denied('Could not remove access.', 500)
  await writeAudit(staff, 'staff.remove', 'staff', userId)
  return NextResponse.json({ ok: true })
}
