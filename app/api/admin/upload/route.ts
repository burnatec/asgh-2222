import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxBytes = 4 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or AVIF image.' }, { status: 415 })
    if (file.size < 1 || file.size > maxBytes) return NextResponse.json({ error: 'Images must be smaller than 5 MB.' }, { status: 413 })

    const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
    const blob = await put(`products/${crypto.randomUUID()}.${extension}`, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
    })
    return NextResponse.json({ url: blob.url })
  } catch {
    return NextResponse.json({ error: 'Image upload failed. Please try again.' }, { status: 500 })
  }
}
