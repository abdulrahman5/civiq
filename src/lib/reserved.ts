// Sub-addresses of theciviq.com.ng that belong to Civiq itself, so no legislator site may use them as its slug
// (a site's preview address is <slug>.theciviq.com.ng).
export const RESERVED_SLUGS = new Set([
  'www', 'portal', 'admin', 'api', 'app', 'demo', 'mail', 'email', 'smtp', 'imap', 'ftp', 'blog', 'help', 'support',
  'docs', 'status', 'civiq', 'dashboard', 'login', 'static', 'cdn', 'assets', 'media', 'staging', 'dev', 'test',
])
