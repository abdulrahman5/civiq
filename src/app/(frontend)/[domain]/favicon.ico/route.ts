// Browsers and bots ask for /favicon.ico by default; send them to this site's own icon.
export function GET() {
  // A relative address, so it always stays on the domain the visitor used.
  return new Response(null, { status: 308, headers: { Location: '/favicon.svg' } })
}
