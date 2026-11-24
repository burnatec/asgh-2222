import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export function serviceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing Supabase server key')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function requireAdmin() {
  const auth = await createServerSupabaseClient()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user || user.app_metadata?.role !== 'admin') return null
  return user
}
