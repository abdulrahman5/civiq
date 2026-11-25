import { headers } from 'next/headers'

import { appForHost, requestHost } from '@/lib/apps'
import { Fonts } from './Fonts'

// Login-screen logo: says which app this address is (the Civiq Admin or the Portal).
export async function Logo() {
  const admin = appForHost(requestHost(await headers())) === 'admin'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <Fonts />
      <img src="/civiq-mark.svg" alt="" width={52} height={52} style={{ borderRadius: 12 }} />
      <span style={{ lineHeight: 1.2 }}>
        <strong style={{ display: 'block', fontSize: 22, letterSpacing: '-0.01em' }}>{admin ? 'Civiq Admin' : 'Civiq'}</strong>
        <span style={{ opacity: 0.7, fontSize: 14 }}>{admin ? 'For the Civiq team only' : 'Portal for legislators and their teams'}</span>
      </span>
    </div>
  )
}
