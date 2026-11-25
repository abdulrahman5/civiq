import { headers } from 'next/headers'

import { appForHost, requestHost } from '@/lib/apps'

// Under the login form: who this sign-in is for and how to get an account.
export async function LoginFoot() {
  const admin = appForHost(requestHost(await headers())) === 'admin'
  return (
    <p className="cq-login-foot">
      {admin ? 'Civiq team accounts only. Legislators’ teams log in at the Civiq Portal.' : 'No account yet? Ask your team’s admin to invite you, or contact the Civiq team.'}
    </p>
  )
}
