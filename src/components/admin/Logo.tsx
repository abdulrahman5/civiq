export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <img src="/civiq-mark.svg" alt="" width={52} height={52} style={{ borderRadius: 12 }} />
      <span style={{ lineHeight: 1.2 }}>
        <strong style={{ display: 'block', fontSize: 22, letterSpacing: '-0.01em' }}>Civiq</strong>
        <span style={{ opacity: 0.7, fontSize: 14 }}>Portal for legislators and their teams</span>
      </span>
    </div>
  )
}
