import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Afro Superstore Ghana | Good Things, Gathered',
  description: 'Thoughtful goods, bold flavours and beautiful finds, made or sourced with care across Ghana. Shop pantry, beauty, home and accessories.',
  applicationName: 'Afro Superstore Ghana',
  openGraph: {
    title: 'Afro Superstore Ghana | Good Things, Gathered',
    description: 'Good things from Ghana, for everywhere you call home.',
    type: 'website',
    locale: 'en_GH',
  },
  icons: {
    icon: [{ url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon-J3FBt5EemjGJX2UercXcsBhA0sxYAh.png', type: 'image/png' }],
    shortcut: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon-J3FBt5EemjGJX2UercXcsBhA0sxYAh.png',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fd1212',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GH">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
