import { randomBytes } from 'node:crypto'
import { one, query, run } from './db'
import { sendEmail } from './email'
import { UserError } from './errors'
import { siteUrl } from './gifts'
import type { UserRow } from './users'

// The waitlist lives at /waitlist. With PRELAUNCH=1, new accounts also wait to be let in.
// People who already have a profile, admins, and anyone let in from the admin page carry on as normal.

export function prelaunch() {
  return process.env.PRELAUNCH === '1'
}

/** Each friend who joins through your link moves you this much earlier in the line. */
const BOOST_MS = 86_400_000

type Row = { email: string; name: string | null; code: string; referred_by: string | null; created_at: number; admitted_at: number | null }

function newCode() {
  return randomBytes(5).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 7) || randomBytes(4).toString('hex')
}

/** Where someone stands: 1 is next in. Admitted people are out of the line. */
async function standing(row: Row) {
  const [r] = await query<{ referrals: number; ahead: number; total: number }>(
    `WITH scored AS (
       SELECT w.email, w.created_at - ? * (SELECT COUNT(*) FROM waitlist x WHERE x.referred_by = w.code) AS score
       FROM waitlist w WHERE w.admitted_at IS NULL
     )
     SELECT
       (SELECT COUNT(*) FROM waitlist WHERE referred_by = ?) AS referrals,
       (SELECT COUNT(*) FROM scored WHERE score < (SELECT score FROM scored WHERE email = ?)) AS ahead,
       (SELECT COUNT(*) FROM waitlist) AS total`,
    [BOOST_MS, row.code, row.email],
  )
  return {
    code: row.code,
    name: row.name,
    referrals: Number(r?.referrals ?? 0),
    position: row.admitted_at ? 0 : Number(r?.ahead ?? 0) + 1,
    total: Number(r?.total ?? 0),
    admitted: !!row.admitted_at,
    inviteUrl: `${siteUrl()}/waitlist?ref=${row.code}`,
  }
}

export type Standing = Awaited<ReturnType<typeof standing>>

export async function waitlistCount() {
  const [r] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM waitlist')
  return Number(r?.n ?? 0)
}

export async function joinWaitlist(input: { email: string; name?: string; ref?: string }) {
  const email = input.email.trim().toLowerCase()
  const existing = await one<Row>('SELECT * FROM waitlist WHERE email = ?', [email])
  if (existing) return { ...(await standing(existing)), already: true }

  // Only count a referral code that belongs to someone else on the list.
  const ref = input.ref ? await one<{ code: string }>('SELECT code FROM waitlist WHERE code = ?', [input.ref.toLowerCase()]) : null
  let code = newCode()
  for (let i = 0; i < 3 && (await one('SELECT 1 FROM waitlist WHERE code = ?', [code])); i++) code = newCode()
  const name = input.name?.trim() || null
  await run('INSERT OR IGNORE INTO waitlist (email, name, code, referred_by, created_at) VALUES (?, ?, ?, ?, ?)', [
    email,
    name,
    code,
    ref?.code ?? null,
    Date.now(),
  ])
  const row = (await one<Row>('SELECT * FROM waitlist WHERE email = ?', [email]))!
  const now = await standing(row)
  void sendEmail({
    to: email,
    subject: `You're on the GiftMe waitlist (#${now.position})`,
    text: [
      name ? `Hi ${name.split(' ')[0]},` : 'Hi,',
      '',
      `You're number ${now.position} on the GiftMe waitlist. We'll email you the moment it's your turn.`,
      '',
      'Want in sooner? Every friend who joins with your link moves you up the line:',
      now.inviteUrl,
      '',
      'GiftMe: wishlists your friends can actually give to.',
    ].join('\n'),
  })
  return { ...now, already: false }
}

export async function waitlistStanding(code: string) {
  const row = await one<Row>('SELECT * FROM waitlist WHERE code = ?', [code.toLowerCase()])
  return row ? standing(row) : null
}

/** Whether this account may finish signing up while pre-launch is on. */
export async function canCreateProfile(row: UserRow | null, admin: boolean) {
  if (!prelaunch() || admin) return true
  if (!row) return false
  if (row.handle) return true
  if (!row.email) return false
  return !!(await one('SELECT 1 FROM waitlist WHERE email = ? AND admitted_at IS NOT NULL', [row.email.toLowerCase()]))
}

export async function waitlistForAdmin() {
  const rows = await query<Row & { referrals: number }>(
    `SELECT w.*, (SELECT COUNT(*) FROM waitlist x WHERE x.referred_by = w.code) AS referrals
     FROM waitlist w
     ORDER BY w.admitted_at IS NOT NULL, w.created_at - ? * (SELECT COUNT(*) FROM waitlist x WHERE x.referred_by = w.code)`,
    [BOOST_MS],
  )
  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    referrals: Number(r.referrals),
    joined: Number(r.created_at),
    admitted: r.admitted_at ? Number(r.admitted_at) : null,
  }))
}

export async function admitFromWaitlist(email: string) {
  const row = await one<Row>('SELECT * FROM waitlist WHERE email = ?', [email.toLowerCase()])
  if (!row) throw new UserError('That email is not on the waitlist.')
  if (row.admitted_at) return
  await run('UPDATE waitlist SET admitted_at = ? WHERE email = ?', [Date.now(), row.email])
  await sendEmail({
    to: row.email,
    subject: "You're in: your GiftMe invite",
    text: [
      row.name ? `Hi ${row.name.split(' ')[0]},` : 'Hi,',
      '',
      "It's your turn. Sign in with this email address to make your first wishlist:",
      `${siteUrl()}/start`,
      '',
      'Thanks for waiting,',
      'GiftMe',
    ].join('\n'),
  })
}
