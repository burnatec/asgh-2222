import type { Metadata } from 'next'
import { InfoPageShell } from '@/components/info-page-shell'
import { TrackOrderContent } from '@/components/info-page-content'

export const metadata: Metadata = { title: 'Track Your Order | Afro Superstore Ghana', description: 'Check order progress, payment status and delivery area for an Afro Superstore Ghana order.' }
export default function TrackOrderPage() { return <InfoPageShell eyebrow="ORDER SUPPORT" title="Let’s find your order." intro="Use the order reference from your confirmation and the email address used at checkout."><TrackOrderContent /></InfoPageShell> }
