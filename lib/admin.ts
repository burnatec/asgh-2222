import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type StaffRole = 'owner' | 'manager' | 'fulfilment' | 'content'
export type Permission = 'orders:read' | 'orders:write' | 'products:read' | 'products:write' | 'customers:read' | 'staff:manage' | 'audit:read' | 'settings:write'

export const STAFF_ROLES: StaffRole[] = ['owner', 'manager', 'fulfilment', 'content']

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: ['orders:read', 'orders:write', 'products:read', 'products:write', 'customers:read', 'staff:manage', 'audit:read', 'settings:write'],
  manager: ['orders:read', 'orders:write', 'products:read', 'products:write', 'customers:read', 'audit:read', 'settings:write'],
  fulfilment: ['orders:read', 'orders:write', 'products:read'],
  content: ['products:read', 'products:write'],
}

export type Staff = { id: string; email: string; role: StaffRole; permissions: Permission[] }

export function serviceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function can(role: StaffRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission)
}

// Resolves the signed-in staff member. Legacy app_metadata admins are treated as owners.
export async function getStaff(): Promise<Staff | null> {
  const auth = await createServerSupabaseClient()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user) return null
  let role: StaffRole | null = user.app_metadata?.role === 'admin' ? 'owner' : null
  if (!role) {
    const { data } = await serviceClient().from('staff_roles').select('role').eq('user_id', user.id).maybeSingle()
    if (data && STAFF_ROLES.includes(data.role as StaffRole)) role = data.role as StaffRole
  }
  if (!role) return null
  return { id: user.id, email: user.email ?? '', role, permissions: ROLE_PERMISSIONS[role] }
}

export async function requireStaff(permission: Permission) {
  const staff = await getStaff()
  if (!staff) return { staff: null, status: 403 as const, error: 'Staff access required.' }
  if (!can(staff.role, permission)) return { staff: null, status: 403 as const, error: 'Your role does not allow this action.' }
  return { staff, status: 200 as const, error: '' }
}

export async function requireAdmin() {
  const staff = await getStaff()
  return staff ? { id: staff.id, email: staff.email } : null
}

export async function writeAudit(staff: Staff, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  try {
    await serviceClient().from('audit_logs').insert({ actor_id: staff.id, actor_email: staff.email, actor_role: staff.role, action, entity, entity_id: entityId, details })
  } catch (cause) {
    console.error('[audit] write failed', { message: cause instanceof Error ? cause.message : 'unknown' })
  }
}
