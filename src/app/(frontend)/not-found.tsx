import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Site not found', robots: { index: false, follow: false } }

// Shown for a domain that is not connected to any legislator's site (or a suspended one).
export default function SiteNotFound() {
  return (
    <main className="article" style={{ textAlign: 'center', minHeight: '70vh' }}>
      <span className="eyebrow">Civiq</span>
      <h1>Site not found</h1>
      <p className="lead" style={{ margin: '12px auto 0' }}>
        This address is not connected to a legislator’s site yet. If you manage this site, check its domain settings in the Civiq Portal.
      </p>
    </main>
  )
}
