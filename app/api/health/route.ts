import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requiredVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'RESEND_API_KEY',
  'RESEND_EMAIL_DOMAIN',
  'BLOB_READ_WRITE_TOKEN',
] as const

export async function GET() {
  const missingEnvironmentVariables: string[] = requiredVariables.filter((name) => !process.env[name]?.trim())
  const paystackKey = process.env.PAYSTACK_TEST_SECRET_KEY?.trim() || process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!paystackKey) missingEnvironmentVariables.push('PAYSTACK_TEST_SECRET_KEY or PAYSTACK_SECRET_KEY')

  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!publishableKey) {
    missingEnvironmentVariables.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY')
  }

  if (process.env.RAILWAY_PROJECT_ID && !process.env.APP_PUBLIC_URL?.trim()) {
    missingEnvironmentVariables.push('APP_PUBLIC_URL')
  }

  if (!serviceKey) {
    missingEnvironmentVariables.push('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY')
  }

  let database = 'not_checked'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (supabaseUrl && serviceKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS')

      const response = await fetch(new URL('/rest/v1/products?select=id&limit=1', baseUrl), {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })

      database = response.ok ? 'ok' : 'unavailable'
    } catch {
      database = 'unavailable'
    }
  }

  const ready = missingEnvironmentVariables.length === 0 && database === 'ok'
  const response = NextResponse.json({
    status: ready ? 'ok' : 'not_ready',
    checks: {
      configuration: missingEnvironmentVariables.length === 0 ? 'ok' : 'incomplete',
      database,
    },
    ...(missingEnvironmentVariables.length > 0 ? { missingEnvironmentVariables } : {}),
  }, { status: ready ? 200 : 503 })

  response.headers.set('Cache-Control', 'no-store')
  return response
}
