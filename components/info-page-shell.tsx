import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { SocialMark } from '@/components/social-mark'

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61555391885092' },
  { label: 'Instagram', href: 'https://www.instagram.com/afrosuperstoregh/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@afro.superstoregh?_r=1&_t=ZS-9BSQMZnyCIu' },
  { label: 'YouTube', href: 'https://youtube.com/@afrosuperstoreghana?si=2E9VRDPd8V7kr49U' },
]

const footerPages = [
  ['Our story', '/our-story'],
  ['Delivery & returns', '/delivery-returns'],
  ['FAQs', '/faqs'],
  ['Contact us', '/contact'],
  ['Track your order', '/track-order'],
  ['Privacy policy', '/privacy-policy'],
  ['Terms & conditions', '/terms-and-conditions'],
]

export function InfoPageShell({ eyebrow = 'AFRO SUPERSTORE GHANA', title, intro, children }: { eyebrow?: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="info-site">
      <header className="info-site-header">
        <Link href="/" className="info-brand" aria-label="Afro Superstore Ghana home"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-BntWL9FJ4tCF0xmRtGmE95PGUW6bZl.png" alt="Afro Superstore Ghana" /></Link>
        <Link href="/" className="info-back"><ArrowLeft size={15} /> Back to the store</Link>
      </header>
      <main className="info-main">
        <div className="info-hero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>
        <div className="info-content">{children}</div>
      </main>
      <footer className="info-footer">
        <div className="info-footer-top">
          <div className="info-footer-brand"><Link href="/" className="info-brand" aria-label="Afro Superstore Ghana home"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-BntWL9FJ4tCF0xmRtGmE95PGUW6bZl.png" alt="" /></Link><p>Good things from Ghana,<br />for everywhere you call home.</p><div className="info-socials" aria-label="Follow Afro Superstore Ghana">{socialLinks.map(({ label, href }) => <a key={label} href={href} aria-label={`Afro Superstore Ghana on ${label}`} target="_blank" rel="noreferrer"><SocialMark network={label as 'Facebook' | 'Instagram' | 'TikTok' | 'YouTube'} /></a>)}</div></div>
          <div className="info-footer-links"><strong>Help & information</strong>{footerPages.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
          <div className="info-footer-contact"><span>HERE TO HELP</span><strong>Akwaaba.<br />You&apos;re always welcome.</strong><a href="mailto:afrosuperstoregh@gmail.com">afrosuperstoregh@gmail.com <ArrowUpRight size={15} /></a><a href="tel:+233553804093">+233 55 380 4093 <ArrowUpRight size={15} /></a><small>16 Odanta Street, Asylum Down,<br />Accra, Ghana, West Africa.</small></div>
        </div>
        <div className="info-footer-bottom"><span>© {new Date().getFullYear()} Afro Superstore Ghana</span><span>Made with care in Ghana</span><div><Link href="/privacy-policy">Privacy</Link><Link href="/terms-and-conditions">Terms</Link><Link href="/">Shop</Link></div></div>
      </footer>
    </div>
  )
}
