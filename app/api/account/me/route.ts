import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getStaff } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ user: null, isStaff: false })
  const staff = await getStaff().catch(() => null)
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
  return NextResponse.json({ user: { email: user.email ?? '', name }, isStaff: Boolean(staff) })
}
