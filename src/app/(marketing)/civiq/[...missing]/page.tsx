import { notFound } from 'next/navigation'

// Any other path on theciviq.com.ng shows the Civiq "page not found".
export default function Missing() {
  notFound()
}
