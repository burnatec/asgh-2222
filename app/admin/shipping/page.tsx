import type { Metadata } from 'next'
import { AdminShippingSettings } from '@/components/admin-shipping-settings'

export const metadata: Metadata = { title: 'Shipping Settings | Afro Superstore Ghana', robots: { index: false, follow: false } }

export default function AdminShippingPage() {
  return <AdminShippingSettings />
}
