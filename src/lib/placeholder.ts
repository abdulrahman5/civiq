/** Text in [square brackets] is placeholder copy that still needs to be filled in. */
export const isPlaceholder = (s?: string | null) => Boolean(s && /^\s*\[.*\]\s*$/s.test(s))
