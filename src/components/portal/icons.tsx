// Small line icons used across the portal (24×24, drawn with the current text colour).
type P = { size?: number; className?: string }
const svg = (children: React.ReactNode) =>
  function Icon({ size = 18, className }: P) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
        {children}
      </svg>
    )
  }

export const IconUsers = svg(<><circle cx="9" cy="7" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-5-6.7" /></>)
export const IconUserPlus = svg(<><circle cx="9" cy="7" r="4" /><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></>)
export const IconInbox = svg(<path d="M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />)
export const IconNews = svg(<path d="M4 4h13v16H6a2 2 0 0 1-2-2zM17 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h5" />)
export const IconMail = svg(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></>)
export const IconChart = svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />)
export const IconBriefcase = svg(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>)
export const IconDownload = svg(<path d="M12 3v12M7 10l5 5 5-5M4 21h16" />)
export const IconPlus = svg(<path d="M12 5v14M5 12h14" />)
export const IconAlert = svg(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>)
export const IconArrow = svg(<path d="M5 12h14M13 6l6 6-6 6" />)
export const IconExternal = svg(<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />)
export const IconLandmark = svg(<path d="M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M2 10l10-7 10 7z" />)
export const IconActivity = svg(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />)
export const IconLifeBuoy = svg(<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M4.9 4.9l4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3" /></>)
export const IconCheck = svg(<><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></>)
