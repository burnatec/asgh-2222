import { NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

export async function GET() {
  const { staff, error, status } = await requireStaff('audit:read')
  if (!staff) return NextResponse.json({ error }, { status })
  const { data, error: queryError } = await serviceClient().from('audit_logs').select('id,actor_email,actor_role,action,entity,entity_id,details,created_at').order('created_at', { ascending: false }).limit(100)
  if (queryError) return NextResponse.json({ error: 'Could not load the activity log.' }, { status: 500 })
  return NextResponse.json({ logs: data })
}
