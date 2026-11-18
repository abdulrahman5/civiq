import { type CollectionSlug, type Endpoint, parseCookies, type Where } from 'payload'

// Quote every cell, and neutralise values that spreadsheet apps would run as formulas.
const csvCell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join('; ') : String(v ?? '')
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

/**
 * GET /api/<collection>/export-csv: downloads the records of the legislator currently selected in the
 * portal's Legislator menu. Access control still limits the result to tenants the user may read.
 */
export const csvExportEndpoint = (collection: CollectionSlug, columns: readonly string[], fileStem: string): Endpoint => ({
  path: '/export-csv',
  method: 'get',
  handler: async (req) => {
    if (!req.user) return Response.json({ error: 'Not allowed' }, { status: 403 })
    const selected = parseCookies(req.headers).get('payload-tenant')
    const where: Where | undefined = selected ? { tenant: { equals: Number(selected) || selected } } : undefined
    const { docs } = await req.payload.find({ collection, pagination: false, sort: '-createdAt', where, depth: 0, req, overrideAccess: false })
    const rows = [columns.join(','), ...docs.map((d) => columns.map((c) => csvCell((d as unknown as Record<string, unknown>)[c])).join(','))]
    const date = new Date().toISOString().slice(0, 10)
    return new Response('﻿' + rows.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileStem}-${date}.csv"`,
      },
    })
  },
})
