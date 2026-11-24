import { headers } from 'next/headers'

import { appForHost, requestHost } from '@/lib/apps'
import { HelpLink } from './HelpLink'

// Header button shown in the Portal only (the Civiq Admin is where requests are answered).
export async function HelpButton() {
  if (appForHost(requestHost(await headers())) === 'admin') return null
  return <HelpLink />
}
