'use client'

// Opens a legislator's dashboard from the all-sites overview: picks them in the Legislator menu
// (the multi-tenant plugin's cookie) and reloads Home.
export function OpenDashboard({ id, name }: { id: number; name: string }) {
  return (
    <a
      href="/admin"
      onClick={(e) => {
        e.preventDefault()
        document.cookie = `payload-tenant=${id}; path=/; SameSite=Lax`
        window.location.href = '/admin'
      }}
    >
      {name}
    </a>
  )
}
