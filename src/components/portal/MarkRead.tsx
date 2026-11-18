'use client'

import { useDocumentInfo, useField } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

// Invisible: when a team member opens an unread message, mark it as read (on the server and in the
// open form, so a later Save keeps it read).
export function MarkRead() {
  const { id } = useDocumentInfo()
  const { value, setValue } = useField<string>({ path: 'status' })
  const done = useRef(false)

  useEffect(() => {
    if (!id || value !== 'unread' || done.current) return
    done.current = true
    fetch(`/api/messages/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    })
      .then((r) => r.ok && setValue('read', true))
      .catch(() => {})
  }, [id, value, setValue])

  return null
}
