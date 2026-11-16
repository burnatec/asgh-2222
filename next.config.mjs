/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
  async rewrites() {
    const railwayOrigin = process.env.RAILWAY_API_ORIGIN?.replace(/\/$/, '')
    if (!railwayOrigin) return []

    return {
      beforeFiles: [
        { source: '/api/admin', destination: `${railwayOrigin}/api/admin` },
        { source: '/api/checkout', destination: `${railwayOrigin}/api/checkout` },
        { source: '/api/health', destination: `${railwayOrigin}/api/health` },
        { source: '/api/payments/verify', destination: `${railwayOrigin}/api/payments/verify` },
      ],
    }
  },
}

export default nextConfig
