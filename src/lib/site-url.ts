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

// Every tenant also gets a preview address at <slug>.<root domain>, e.g. saidumusa.theciviq.com.ng
export const getRootDomain = () => (process.env.PLATFORM_ROOT_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '')
