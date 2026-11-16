import type { Metadata } from 'next'
import { InfoPageShell } from '@/components/info-page-shell'
import { ContactContent } from '@/components/info-page-content'

export const metadata: Metadata = { title: 'Contact Us | Afro Superstore Ghana', description: 'Contact Afro Superstore Ghana by email, phone or our secure website contact form.' }
export default function ContactPage() { return <InfoPageShell title="We’d love to hear from you." intro="A question, a kind word or a little help with your order? Our team is here for you."><ContactContent /></InfoPageShell> }
