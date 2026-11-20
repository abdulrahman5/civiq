import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: false } }

// Any other path on theciviq.com.ng shows the Civiq "page not found".
export default function Missing() {
  notFound()
}
