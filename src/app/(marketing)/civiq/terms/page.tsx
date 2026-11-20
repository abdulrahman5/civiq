import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms for using theciviq.com.ng, the website of Civiq, digital platforms for Nigerian legislators.',
  alternates: { canonical: '/terms' },
}

export default function CiviqTerms() {
  return (
    <article className="mk-legal">
      <p className="mk-eyebrow">Civiq</p>
      <h1>Terms of use</h1>
      <p className="mk-updated">Last updated November 2026</p>
      <p>These terms cover your use of this website, theciviq.com.ng. The Civiq service itself is provided to legislators’ offices under a separate agreement.</p>
      <h2>Using this website</h2>
      <p>You may browse this website and request a demo. Please do not misuse it, for example by sending spam, attempting to break its security or copying it for commercial use.</p>
      <h2>Information on this site</h2>
      <p>We describe Civiq as accurately as we can. Examples, names and figures shown in product illustrations are fictional. Features may change as we improve the service.</p>
      <h2>Legislators’ websites</h2>
      <p>Each legislator’s website is published by that legislator’s office, which is responsible for its content. Civiq provides the technology.</p>
      <h2>Liability</h2>
      <p>This website is provided as it is. To the extent the law allows, Civiq is not liable for losses arising from your use of it.</p>
      <h2>Law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
    </article>
  )
}
