import { query } from './db'
import { UserError } from './errors'
import type { UserRow } from './users'

// A private numbers page for whoever runs GiftMe. Admins are the emails in ADMIN_EMAILS
// (comma separated). Everyone else gets "not found", so the page isn't even visible.

export function isAdmin(row: Pick<UserRow, 'email'> | null) {
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return !!row?.email && allowed.includes(row.email.toLowerCase())
}

const DAY = 86_400_000

export async function adminStats(viewer: UserRow) {
  if (!isAdmin(viewer)) throw new UserError('Not found.')
  const since = Date.now() - 7 * DAY
  const num = async (sql: string, args: (string | number)[] = []) => Number((await query<{ n: number }>(sql, args))[0]?.n ?? 0)
  const [users, usersWeek, profiles, withBank, findable, wishlists, items, gifts, giftsWeek, raisedKobo, reservations] = await Promise.all([
    num('SELECT COUNT(*) AS n FROM users'),
    num('SELECT COUNT(*) AS n FROM users WHERE created_at > ?', [since]),
    num('SELECT COUNT(*) AS n FROM users WHERE handle IS NOT NULL'),
    num('SELECT COUNT(*) AS n FROM users WHERE paystack_subaccount IS NOT NULL'),
    num('SELECT COUNT(*) AS n FROM users WHERE discoverable = 1'),
    num('SELECT COUNT(*) AS n FROM wishlists'),
    num('SELECT COUNT(*) AS n FROM items'),
    num("SELECT COUNT(*) AS n FROM contributions WHERE status = 'success'"),
    num("SELECT COUNT(*) AS n FROM contributions WHERE status = 'success' AND created_at > ?", [since]),
    num("SELECT COALESCE(SUM(amount_kobo), 0) AS n FROM contributions WHERE status = 'success'"),
    num('SELECT COUNT(*) AS n FROM reservations'),
  ])
  // Sign-ups per day for the last two weeks, oldest first.
  const days = await query<{ day: string; n: number }>(
    `SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM users WHERE created_at > ? GROUP BY day`,
    [Date.now() - 14 * DAY],
  )
  const byDay = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * DAY).toISOString().slice(0, 10)
    return { day, n: Number(days.find((d) => d.day === day)?.n ?? 0) }
  })
  const recent = await query<{ display_name: string; handle: string | null; created_at: number; lists: number }>(
    `SELECT users.display_name, users.handle, users.created_at, (SELECT COUNT(*) FROM wishlists WHERE owner_id = users.id) AS lists
     FROM users ORDER BY created_at DESC LIMIT 12`,
  )
  return {
    totals: { users, usersWeek, profiles, withBank, findable, wishlists, items, gifts, giftsWeek, raisedNgn: raisedKobo / 100, reservations },
    byDay,
    recent: recent.map((r) => ({ name: r.display_name, handle: r.handle, joined: Number(r.created_at), lists: Number(r.lists) })),
  }
}
