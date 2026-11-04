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

/**
 * When a card gift reaches the owner's bank. Paystack pays split payments out the next
 * business day (T+1), so weekends roll to Monday. Public holidays can add a day.
 */
export function payoutDate(paidAt: number) {
  const lagos = new Date(new Date(paidAt).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) + 'T12:00:00Z')
  do lagos.setUTCDate(lagos.getUTCDate() + 1)
  while (lagos.getUTCDay() === 0 || lagos.getUTCDay() === 6)
  return lagos
}

export function payoutLabel(paidAt: number) {
  return payoutDate(paidAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
