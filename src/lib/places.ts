/** Tidies a ward / LGA / state as typed by the public ("  bida   central" → "Bida Central"), so counts group cleanly. */
export const tidyPlace = (v: string) =>
  v
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase())
