import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: false } }

export default function CiviqNotFound() {
  return (
    <article className="mk-legal" style={{ textAlign: 'center' }}>
      <p className="mk-eyebrow">Civiq</p>
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <p><Link href="/">Back to the Civiq home page</Link></p>
    </article>
  )
}
