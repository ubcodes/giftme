// Event dates are stored as plain YYYY-MM-DD and shown in Lagos time.

export function formatDate(date: string) {
  return new Date(`${date}T12:00:00+01:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Whole days from today (Lagos) until the date; negative once it has passed. */
export function daysUntil(date: string, now = new Date()) {
  const today = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) + 'T00:00:00Z')
  const target = new Date(`${date}T00:00:00Z`)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function countdownText(date: string) {
  const d = daysUntil(date)
  if (d > 1) return `${d} days to go`
  if (d === 1) return 'Tomorrow'
  if (d === 0) return 'Today'
  return null
}
