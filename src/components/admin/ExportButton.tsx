// Shown above the Inbox and Supporters lists: downloads the selected legislator's records as a CSV file.
export function ExportButton({ collectionSlug }: { collectionSlug?: string }) {
  if (!collectionSlug) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <a className="btn btn--style-secondary btn--size-small" href={`/api/${collectionSlug}/export-csv`} style={{ margin: 0 }}>
        Download all as CSV
      </a>
    </div>
  )
}
