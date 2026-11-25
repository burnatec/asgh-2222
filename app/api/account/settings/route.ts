import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const publicKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const action = body?.action

  if (action === 'profile') {
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 100) : ''
    if (!fullName) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { error: profileError } = await admin.from('profiles').update({ full_name: fullName }).eq('id', user.id)
    if (profileError) return NextResponse.json({ error: 'We could not save your name. Please try again.' }, { status: 500 })
    await supabase.auth.updateUser({ data: { full_name: fullName } })
    return NextResponse.json({ ok: true, fullName })
  }

  if (action === 'password') {
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    if (newPassword.length < 8 || newPassword.length > 72) {
      return NextResponse.json({ error: 'Choose a new password between 8 and 72 characters.' }, { status: 400 })
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'Your new password must be different from the current one.' }, { status: 400 })
    }

    const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publicKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (verifyError) return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 400 })

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return NextResponse.json({ error: 'We could not update your password. Please try again.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown request.' }, { status: 400 })
}
