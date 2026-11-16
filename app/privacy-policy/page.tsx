import type { Metadata } from 'next'
import { InfoPageShell } from '@/components/info-page-shell'
import { PrivacyContent } from '@/components/info-page-content'

export const metadata: Metadata = { title: 'Privacy Policy | Afro Superstore Ghana', description: 'Learn how Afro Superstore Ghana collects, uses, stores and protects customer information under applicable Ghanaian data protection requirements.' }
export default function PrivacyPolicyPage() { return <InfoPageShell title="Your privacy matters." intro="How we handle the information you share with Afro Superstore Ghana, and the choices available to you."><PrivacyContent /></InfoPageShell> }
