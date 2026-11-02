import { query, run } from './db'
import { UserError } from './errors'
import { ensureEmailHash, socialsOf, type UserRow } from './users'
import type { Socials } from '@/lib/contacts'

// Finding friends on GiftMe. Only people who switched on "Let friends find me" ever show up,
// whether through gifts given, a phone's contacts or search.

export type Person = {
  handle: string
  displayName: string
  avatarUrl: string | null
  socials: Socials
  /** Why they're suggested, e.g. "Gave to your wedding list". */
  reason: string | null
  following: boolean
  next: { title: string; slug: string; occasion: string; eventDate: string | null } | null
  wishlistCount: number
}

type PersonRow = Pick<UserRow, 'id' | 'display_name' | 'handle' | 'avatar_url' | 'instagram' | 'tiktok' | 'x_handle' | 'substack'>

const PERSON_COLUMNS = 'users.id, users.display_name, users.handle, users.avatar_url, users.instagram, users.tiktok, users.x_handle, users.substack'

async function toPeople(viewerId: string, rows: (PersonRow & { reason?: string | null })[]): Promise<Person[]> {
  const unique = [...new Map(rows.filter((r) => r.handle && r.id !== viewerId).map((r) => [r.id, r])).values()]
  if (unique.length === 0) return []
  const ids = unique.map((r) => r.id)
  const marks = ids.map(() => '?').join(',')
  const [follows, lists] = await Promise.all([
    query<{ followee_id: string }>(`SELECT followee_id FROM follows WHERE follower_id = ? AND followee_id IN (${marks})`, [viewerId, ...ids]),
    query<{ owner_id: string; title: string; slug: string; occasion: string; event_date: string | null }>(
      `SELECT owner_id, title, slug, occasion, event_date FROM wishlists WHERE owner_id IN (${marks}) ORDER BY created_at DESC`,
      ids,
    ),
  ])
  const followed = new Set(follows.map((f) => f.followee_id))
  const today = new Date().toISOString().slice(0, 10)
  return unique.map((r) => {
    const theirs = lists.filter((l) => l.owner_id === r.id)
    // The next celebration coming up, or else their newest list.
    const upcoming = theirs.filter((l) => l.event_date && l.event_date >= today).sort((a, b) => a.event_date!.localeCompare(b.event_date!))[0]
    const pick = upcoming ?? theirs[0]
    return {
      handle: r.handle!,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      socials: socialsOf(r),
      reason: r.reason ?? null,
      following: followed.has(r.id),
      next: pick ? { title: pick.title, slug: pick.slug, occasion: pick.occasion, eventDate: pick.event_date } : null,
      wishlistCount: theirs.length,
    }
  })
}

/** People connected to you through gifts: they gave to your lists, or you gave to theirs. */
export async function peopleYouKnow(viewer: UserRow) {
  const rows: (PersonRow & { reason: string })[] = []
  if (viewer.email) {
    rows.push(
      ...(await query<PersonRow & { reason: string }>(
        `SELECT DISTINCT ${PERSON_COLUMNS}, 'You gave to ' || wishlists.title AS reason
         FROM contributions JOIN users ON users.id = contributions.owner_id JOIN wishlists ON wishlists.id = contributions.wishlist_id
         WHERE lower(contributions.email) = lower(?) AND contributions.status = 'success' AND users.discoverable = 1`,
        [viewer.email],
      )),
    )
  }
  rows.push(
    ...(await query<PersonRow & { reason: string }>(
      `SELECT DISTINCT ${PERSON_COLUMNS}, 'Gave to ' || wishlists.title AS reason
       FROM contributions JOIN users ON lower(users.email) = lower(contributions.email) JOIN wishlists ON wishlists.id = contributions.wishlist_id
       WHERE contributions.owner_id = ? AND contributions.status = 'success' AND users.discoverable = 1`,
      [viewer.id],
    )),
  )
  return toPeople(viewer.id, rows)
}

let emailHashesFilled = false

/** People in your phone's contacts, matched by hashed numbers and emails. The list itself isn't stored. */
export async function matchContacts(viewer: UserRow, hashes: string[]) {
  if (!emailHashesFilled) {
    const missing = await query<Pick<UserRow, 'id' | 'email' | 'email_hash'>>('SELECT id, email, email_hash FROM users WHERE email_hash IS NULL AND email IS NOT NULL')
    for (const row of missing) await ensureEmailHash(row)
    emailHashesFilled = true
  }
  const found: PersonRow[] = []
  // SQLite caps the number of bound values, so match in chunks.
  for (let i = 0; i < hashes.length; i += 400) {
    const chunk = hashes.slice(i, i + 400)
    const marks = chunk.map(() => '?').join(',')
    found.push(
      ...(await query<PersonRow>(
        `SELECT ${PERSON_COLUMNS} FROM users WHERE discoverable = 1 AND (phone_hash IN (${marks}) OR email_hash IN (${marks}))`,
        [...chunk, ...chunk],
      )),
    )
  }
  return toPeople(
    viewer.id,
    found.map((r) => ({ ...r, reason: 'In your contacts' })),
  )
}

/** Find someone by name, GiftMe link name, or their Instagram, TikTok, X or Substack handle. */
export async function searchPeople(viewer: UserRow, raw: string) {
  const q = raw.trim().replace(/^@+/, '').toLowerCase()
  if (q.length < 2) return []
  const like = `%${q.replace(/[%_]/g, '')}%`
  const rows = await query<PersonRow>(
    `SELECT ${PERSON_COLUMNS} FROM users
     WHERE discoverable = 1 AND handle IS NOT NULL AND (
       lower(display_name) LIKE ? OR handle = ? OR lower(instagram) = ? OR lower(tiktok) = ? OR lower(x_handle) = ? OR lower(substack) = ?
     )
     ORDER BY (handle = ?) DESC, display_name LIMIT 20`,
    [like, q, q, q, q, q, q],
  )
  return toPeople(viewer.id, rows)
}

export async function followingList(viewer: UserRow) {
  const rows = await query<PersonRow>(
    `SELECT ${PERSON_COLUMNS} FROM follows JOIN users ON users.id = follows.followee_id
     WHERE follows.follower_id = ? ORDER BY follows.created_at DESC`,
    [viewer.id],
  )
  return toPeople(viewer.id, rows)
}

export async function setFollow(viewer: UserRow, handle: string, follow: boolean) {
  const target = (await query<{ id: string; discoverable: number }>('SELECT id, discoverable FROM users WHERE handle = ?', [handle.toLowerCase()]))[0]
  if (!target || target.id === viewer.id) throw new UserError('We couldn’t find that person.')
  if (follow) {
    await run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', [viewer.id, target.id, Date.now()])
  } else {
    await run('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [viewer.id, target.id])
  }
}

export async function isFollowing(viewerId: string, handle: string) {
  const row = await query('SELECT 1 FROM follows JOIN users ON users.id = follows.followee_id WHERE follows.follower_id = ? AND users.handle = ?', [
    viewerId,
    handle.toLowerCase(),
  ])
  return row.length > 0
}
