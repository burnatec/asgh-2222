import type { Metadata } from 'next'
import { InfoPageShell } from '@/components/info-page-shell'
import { TermsContent } from '@/components/info-page-content'

export const metadata: Metadata = { title: 'Terms & Conditions | Afro Superstore Ghana', description: 'Read the terms for using the Afro Superstore Ghana website, placing orders and contacting our team.' }
export default function TermsPage() { return <InfoPageShell title="The helpful details." intro="A few clear ground rules for using our website and shopping with Afro Superstore Ghana."><TermsContent /></InfoPageShell> }
