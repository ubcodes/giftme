import { currentUserId, identityFor } from './auth'
import { one, run } from './db'
import { UserError } from './errors'
import { cleanSocialHandle, hashContact, normalizeEmail, normalizePhone, type Socials } from '@/lib/contacts'

export type Profile = {
  id: string
  email: string | null
  displayName: string
  handle: string | null
  avatarUrl: string | null
  bank: { bankName: string; last4: string; accountName: string } | null
  phone: string | null
  discoverable: boolean
  socials: Socials
}

export type UserRow = {
  id: string
  email: string | null
  display_name: string
  handle: string | null
  avatar_url: string | null
  blnk_identity_id: string | null
  paystack_subaccount: string | null
  bank_name: string | null
  account_last4: string | null
  account_name: string | null
  phone: string | null
  phone_hash: string | null
  email_hash: string | null
  discoverable: number
  instagram: string | null
  tiktok: string | null
  x_handle: string | null
  substack: string | null
}

export function socialsOf(row: Pick<UserRow, 'instagram' | 'tiktok' | 'x_handle' | 'substack'>): Socials {
  const s: Socials = {}
  if (row.instagram) s.instagram = row.instagram
  if (row.tiktok) s.tiktok = row.tiktok
  if (row.x_handle) s.x = row.x_handle
  if (row.substack) s.substack = row.substack
  return s
}

export function toProfile(row: UserRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    handle: row.handle,
    avatarUrl: row.avatar_url,
    bank:
      row.paystack_subaccount && row.bank_name
        ? { bankName: row.bank_name, last4: row.account_last4 ?? '', accountName: row.account_name ?? '' }
        : null,
    phone: row.phone,
    discoverable: !!row.discoverable,
    socials: socialsOf(row),
  }
}

export async function getUserRow(id: string) {
  return one<UserRow>('SELECT * FROM users WHERE id = ?', [id])
}

/** The signed-in person's row, created from their sign-in details on first visit. */
export async function viewerRow(): Promise<UserRow | null> {
  const id = await currentUserId()
  if (!id) return null
  const existing = await getUserRow(id)
  if (existing) return existing
  const identity = await identityFor(id)
  const fallbackName = identity.email?.split('@')[0] ?? 'Friend'
  await run(
    `INSERT OR IGNORE INTO users (id, email, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, identity.email, identity.name ?? fallbackName, identity.imageUrl, Date.now()],
  )
  return getUserRow(id)
}

export async function requireUser(): Promise<UserRow> {
  const row = await viewerRow()
  if (!row) throw new UserError('Please sign in first.')
  return row
}

/** Signed in and has finished setting up a profile (so share links work). */
export async function requireOwner(): Promise<UserRow & { handle: string }> {
  const row = await requireUser()
  if (!row.handle) throw new UserError('Finish setting up your profile first.')
  return row as UserRow & { handle: string }
}

const RESERVED = new Set([
  'admin', 'api', 'app', 'dashboard', 'giftme', 'help', 'login', 'media', 'new', 'settings', 'signin', 'signup',
  'start', 'support', 'thank-you', 'w', 'welcome', 'www',
])

export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/

export function normalizeHandle(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

export async function handleAvailable(handle: string, forUserId: string) {
  if (!HANDLE_RE.test(handle) || RESERVED.has(handle)) return false
  const taken = await one<{ id: string }>('SELECT id FROM users WHERE handle = ?', [handle])
  return !taken || taken.id === forUserId
}

export async function suggestHandle(name: string, forUserId: string) {
  const base = normalizeHandle(name) || 'friend'
  const padded = base.length < 3 ? `${base}-gifts` : base
  if (await handleAvailable(padded, forUserId)) return padded
  for (let i = 2; i < 50; i++) {
    const candidate = `${padded.slice(0, 26)}-${i}`
    if (await handleAvailable(candidate, forUserId)) return candidate
  }
  return `${padded.slice(0, 20)}-${Date.now().toString(36).slice(-6)}`
}

export async function saveProfile(userId: string, input: { displayName: string; handle: string; avatarUrl: string | null }) {
  const handle = normalizeHandle(input.handle)
  if (!HANDLE_RE.test(handle)) throw new UserError('Your link name needs 3 to 30 letters, numbers or dashes.')
  if (!(await handleAvailable(handle, userId))) throw new UserError('That link name is taken. Try another one.')
  await run('UPDATE users SET display_name = ?, handle = ?, avatar_url = ? WHERE id = ?', [
    input.displayName,
    handle,
    input.avatarUrl,
    userId,
  ])
}

/** Phone, social handles and whether friends can find this person. */
export async function saveFindability(
  userId: string,
  input: { phone: string; discoverable: boolean; instagram: string; tiktok: string; x: string; substack: string },
) {
  const phone = input.phone.trim() ? normalizePhone(input.phone) : null
  if (input.phone.trim() && !phone) throw new UserError('That phone number doesn’t look right. Try it with the country code, like +234…')
  await run(
    `UPDATE users SET phone = ?, phone_hash = ?, discoverable = ?, instagram = ?, tiktok = ?, x_handle = ?, substack = ? WHERE id = ?`,
    [
      phone,
      phone ? await hashContact(phone) : null,
      input.discoverable ? 1 : 0,
      cleanSocialHandle('instagram', input.instagram),
      cleanSocialHandle('tiktok', input.tiktok),
      cleanSocialHandle('x', input.x),
      cleanSocialHandle('substack', input.substack),
      userId,
    ],
  )
}

/** Email hashes are filled in lazily, so contacts can match people who signed up before this existed. */
export async function ensureEmailHash(row: Pick<UserRow, 'id' | 'email' | 'email_hash'>) {
  if (row.email_hash || !row.email) return
  const email = normalizeEmail(row.email)
  if (email) await run('UPDATE users SET email_hash = ? WHERE id = ?', [await hashContact(email), row.id])
}
