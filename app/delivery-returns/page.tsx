import type { Metadata } from 'next'
import { InfoPageShell } from '@/components/info-page-shell'
import { DeliveryReturnsContent } from '@/components/info-page-content'

export const metadata: Metadata = { title: 'Delivery & Returns | Afro Superstore Ghana', description: 'Review delivery information, returns, exchanges, refunds and help for Afro Superstore Ghana orders.' }
export default function DeliveryReturnsPage() { return <InfoPageShell title="Delivery & returns" intro="What to expect after you place an order, and how to get help if something is not quite right."><DeliveryReturnsContent /></InfoPageShell> }
