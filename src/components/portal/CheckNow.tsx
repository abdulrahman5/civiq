'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// "Check now" on Site health: checks every live site straight away, then refreshes the page.
export function CheckNow() {
  const router = useRouter()
  const [state, setState] = useState<{ busy?: boolean; text?: string; error?: boolean }>({})
  const run = async () => {
    setState({ busy: true })
    const r = await fetch('/api/site-checks/run', { method: 'POST', credentials: 'include' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setState({ text: j.error || 'Could not run the checks.', error: true })
    setState({ text: `Checked ${j.checked} site${j.checked === 1 ? '' : 's'}: ${j.down ? `${j.down} not loading` : 'all loading'}.` })
    router.refresh()
  }
  return (
    <div className="cq-checknow">
      <button type="button" className="btn btn--style-primary btn--size-small" onClick={run} disabled={state.busy}>
        {state.busy ? 'Checking…' : 'Check now'}
      </button>
      {state.text && <span role="status" className={state.error ? 'cq-reply__error' : 'cq-muted'}>{state.text}</span>}
    </div>
  )
}
