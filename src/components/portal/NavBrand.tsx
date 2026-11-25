import { cookies, headers } from 'next/headers'
import type { Payload } from 'payload'

import { appForHost, requestHost } from '@/lib/apps'
import { Fonts } from '../admin/Fonts'
import { getPortalContext } from './context'

// Top of the side menu: which app this is (Civiq Admin or Portal) and, in the Portal, which legislator.
export async function NavBrand({ payload, user }: { payload: Payload; user?: unknown }) {
  const admin = appForHost(requestHost(await headers())) === 'admin'
  let subtitle = admin ? 'Civiq team' : 'Portal'
  if (!admin && user) {
    void (await cookies())
    const ctx = await getPortalContext(payload, user).catch(() => null)
    subtitle = ctx?.tenant?.name ?? (ctx?.platformAdmin ? 'All legislators' : 'Portal')
  }
  return (
    <div className="cq-navbrand">
      <Fonts />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/civiq-mark.svg" alt="" />
      <div>
        <b>{admin ? 'Civiq Admin' : 'Civiq Portal'}</b>
        <span>{subtitle}</span>
        {admin && <span className="cq-navbrand__tag">Team only</span>}
      </div>
    </div>
  )
}
