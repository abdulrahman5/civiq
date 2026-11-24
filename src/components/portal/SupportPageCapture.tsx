'use client'

import { useDocumentInfo } from '@payloadcms/ui'

// Intro on a new support request. The page the person came from ("Need help?" → ?from=) is recorded by the
// server when they save.
export function SupportPageCapture() {
  const { id } = useDocumentInfo()
  if (id) return null
  return (
    <p className="cq-muted cq-support__intro">
      Tell us what you need. The Civiq team is emailed straight away, and you will get an email when we reply. For anything that stops your website working, choose <b>Urgent</b>.
    </p>
  )
}
