import type { Metadata } from 'next'
import { InfoPageShell } from '@/components/info-page-shell'
import { FaqContent } from '@/components/info-page-content'

export const metadata: Metadata = { title: 'FAQs | Afro Superstore Ghana', description: 'Answers to common questions about Afro Superstore Ghana orders, payments, products, delivery, returns and support.' }
export default function FaqPage() { return <InfoPageShell title="A few good answers." intro="Quick help with ordering, payments, products, delivery and getting in touch with our team."><FaqContent /></InfoPageShell> }
