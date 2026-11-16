import type { Metadata } from 'next'
import { InfoPageShell } from '@/components/info-page-shell'
import { OurStoryContent } from '@/components/info-page-content'

export const metadata: Metadata = { title: 'Our Story | Afro Superstore Ghana', description: 'Discover the story, mission and values behind Afro Superstore Ghana and our thoughtfully chosen goods.' }
export default function OurStoryPage() { return <InfoPageShell title="Good things, gathered with care." intro="A little more Ghana in your day—and a little more connection to the people and creativity behind every find."><OurStoryContent /></InfoPageShell> }
