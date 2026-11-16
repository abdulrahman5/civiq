// Where the Civiq console (Payload admin) lives, without trailing slash.
// Uses CONSOLE_URL (e.g. https://console.civiq.ng) once it exists; until then, Vercel's production
// address, so the console keeps working on the current deployment.
export const getConsoleUrl = () => {
  const url = process.env.CONSOLE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (url) return url.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

// The console runs on its own host only once CONSOLE_URL is set; otherwise it shares the deployment's host.
export const getConsoleHost = () => (process.env.CONSOLE_URL ? new URL(process.env.CONSOLE_URL).hostname : null)

// Every tenant also gets a preview address at <slug>.<root domain>, e.g. saidumusa.civiq.ng
export const getRootDomain = () => (process.env.PLATFORM_ROOT_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '')
