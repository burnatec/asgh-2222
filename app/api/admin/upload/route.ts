import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/admin'

export const runtime = 'nodejs'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxBytes = 4 * 1024 * 1024

export async function POST(request: Request) {
  const access = await requireStaff('products:write')
  if (!access.staff) return NextResponse.json({ error: access.error }, { status: access.status })

  const blobToken = process.env.PRODUCT_IMAGES_READ_WRITE_TOKEN
  if (!blobToken) {
    return NextResponse.json({ error: 'Product image storage is not configured.' }, { status: 503 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or AVIF image.' }, { status: 415 })
    if (file.size < 1 || file.size > maxBytes) return NextResponse.json({ error: 'Images must be no larger than 4 MB.' }, { status: 413 })

    const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
    const blob = await put(`products/${crypto.randomUUID()}.${extension}`, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
      token: blobToken,
    })
    return NextResponse.json({ url: blob.url })
  } catch (uploadError) {
    console.error('[admin-upload] Blob upload failed:', uploadError)
    return NextResponse.json({ error: 'Image upload failed. Please try again.' }, { status: 500 })
  }
}
