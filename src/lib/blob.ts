import type { Endpoint } from 'payload'

// Website photos are served straight from Vercel Blob's public CDN (fast, cached worldwide, no server work).
// The public base address comes from the Blob token: vercel_blob_rw_<storeId>_<secret>.
export const blobBaseUrl = () => {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
  return process.env.STORAGE_VERCEL_BLOB_BASE_URL || (storeId ? `https://${storeId}.public.blob.vercel-storage.com` : null)
}

/**
 * GET /api/media/file/:filename — photos used to be served through the app at this address. Links to it
 * (in newsletters already sent, or link previews saved by WhatsApp) now forward to the same photo on the CDN.
 */
export const legacyPhotoRedirect: Endpoint = {
  path: '/file/:filename',
  method: 'get',
  handler: (req) => {
    const base = blobBaseUrl()
    const filename = String(req.routeParams?.filename ?? '')
    if (!base || !filename || filename.includes('/')) return Response.json({ error: 'Not found' }, { status: 404 })
    return new Response(null, {
      status: 308,
      headers: { Location: `${base}/${encodeURIComponent(filename)}`, 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  },
}
