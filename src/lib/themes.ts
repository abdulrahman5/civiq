// The two Civiq site templates. Every legislator's site is identical apart from its chamber's colours,
// which the Civiq team picks when creating the site (Legislator sites → Template).
export const CHAMBERS = {
  senate: {
    label: 'Senate',
    office: 'Senator, Federal Republic of Nigeria',
    brand: '#8a1c24', // deep red, after the Senate chamber
    accent: '#c8a13a', // gold
  },
  reps: {
    label: 'House of Representatives',
    office: 'Member, House of Representatives',
    brand: '#0b5d3b', // deep green, after the House chamber
    accent: '#c8a13a',
  },
} as const

export type Chamber = keyof typeof CHAMBERS
export const CHAMBER_OPTIONS = (Object.keys(CHAMBERS) as Chamber[]).map((value) => ({ value, label: CHAMBERS[value].label }))

/** The colours and default title for a legislator's site, from its chamber. */
export const themeOf = (tenant: { chamber?: string | null } | null | undefined) =>
  CHAMBERS[(tenant?.chamber as Chamber) in CHAMBERS ? (tenant!.chamber as Chamber) : 'reps']
