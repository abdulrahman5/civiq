// Where the Civiq Portal (Payload admin) lives, without trailing slash.
// Uses PORTAL_URL (e.g. https://portal.theciviq.com.ng) once it exists; until then, Vercel's production
// address, so the portal keeps working on the current deployment.
export const getPortalUrl = () => {
  const url = process.env.PORTAL_URL || process.env.CONSOLE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (url) return url.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

// The portal runs on its own host only once PORTAL_URL is set; otherwise it shares the deployment's host.
const portalSetting = () => process.env.PORTAL_URL || process.env.CONSOLE_URL
export const getPortalHost = () => (portalSetting() ? new URL(portalSetting()!).hostname : null)

/** "https://www.theciviq.com.ng/" → "theciviq.com.ng": forgiving about how the setting was typed. */
export const normaliseRootDomain = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^(\*\.|www\.)/, '')
    .replace(/^\.+|\.+$/g, '')

// Civiq's own domain: the marketing site lives on it, and every tenant gets a preview address at
// <slug>.<root domain>, e.g. saidumusa.theciviq.com.ng. From PLATFORM_ROOT_DOMAIN, or else worked out from
// PORTAL_URL (portal.theciviq.com.ng → theciviq.com.ng).
export const getRootDomain = () => {
  const set = normaliseRootDomain(process.env.PLATFORM_ROOT_DOMAIN || '')
  if (set) return set
  const portal = getPortalHost()
  if (!portal || portal.endsWith('.vercel.app') || portal === 'localhost') return ''
  const labels = portal.split('.')
  return labels.length >= 3 ? labels.slice(1).join('.') : ''
}
