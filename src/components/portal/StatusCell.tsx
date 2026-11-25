'use client'

// A status shown as a coloured pill in list views (Inbox, Support, Newsletters, Leads, Users, sites).
type Option = { label: string | Record<string, string>; value: string } | string
type Props = { cellData?: unknown; field?: { options?: Option[] } }

const TONE: Record<string, string> = {
  // done / good
  published: 'good', sent: 'good', resolved: 'good', active: 'good', Active: 'good', subscribed: 'good', signed: 'good', read: 'good',
  // in motion
  'in-progress': 'info', sending: 'info', scheduled: 'info', contacted: 'info', 'demo-booked': 'info', waiting: 'info',
  // needs someone
  new: 'warn', unread: 'warn', draft: 'warn', 'Invited, not joined yet': 'warn',
  // problem
  urgent: 'danger', suspended: 'danger', unsubscribed: 'danger', failed: 'danger',
  // chamber templates
  senate: 'senate', reps: 'reps',
}

export function StatusCell({ cellData, field }: Props) {
  if (cellData === null || cellData === undefined || cellData === '') return null
  const value = String(cellData)
  const opt = field?.options?.find((o) => (typeof o === 'string' ? o : o.value) === value)
  const raw = opt === undefined ? value : typeof opt === 'string' ? opt : typeof opt.label === 'string' ? opt.label : (opt.label.en ?? value)
  const label = raw.split(':')[0] // "Urgent: the website is down…" → "Urgent"
  return <span className={`cq-badge${TONE[value] ? ` cq-badge--${TONE[value]}` : ''}`}>{label}</span>
}
