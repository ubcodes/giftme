// Shared by the browser and the server: phone numbers and emails are normalised the same way
// on both sides and compared as SHA-256 hashes, so a contact list never leaves the phone in
// readable form.

/** E.164-style digits with a leading +. Nigerian local numbers (0803…) become +234803…. */
export function normalizePhone(input: string): string | null {
  const plus = input.trim().startsWith('+')
  let digits = input.replace(/\D/g, '')
  if (!digits) return null
  if (plus) return digits.length >= 8 ? `+${digits}` : null
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = `234${digits.slice(1)}`
  else if (digits.length === 10 && /^[789]/.test(digits)) digits = `234${digits}`
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
}

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export async function hashContact(value: string) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(`giftme:${value}`))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

export type RawContact = { name: string; phones: string[]; emails: string[] }

/** Hashes of every usable phone number and email in a list of contacts. */
export async function contactHashes(contacts: RawContact[]) {
  const values = new Set<string>()
  for (const c of contacts) {
    for (const p of c.phones) {
      const n = normalizePhone(p)
      if (n) values.add(n)
    }
    for (const e of c.emails) {
      const n = normalizeEmail(e)
      if (n) values.add(n)
    }
  }
  return Promise.all([...values].map(hashContact))
}

/** Reads a .vcf file (what iPhone and Google Contacts export) into names, numbers and emails. */
export function parseVcf(text: string): RawContact[] {
  const contacts: RawContact[] = []
  // Folded lines continue with a leading space.
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  let current: RawContact | null = null
  for (const line of lines) {
    const upper = line.toUpperCase()
    if (upper.startsWith('BEGIN:VCARD')) current = { name: '', phones: [], emails: [] }
    else if (upper.startsWith('END:VCARD')) {
      if (current && (current.phones.length || current.emails.length)) contacts.push(current)
      current = null
    } else if (current) {
      const value = line.slice(line.indexOf(':') + 1).trim()
      if (/^(item\d+\.)?FN[;:]/i.test(line)) current.name = value
      else if (/^(item\d+\.)?TEL[;:]/i.test(line)) current.phones.push(value)
      else if (/^(item\d+\.)?EMAIL[;:]/i.test(line)) current.emails.push(value)
    }
  }
  return contacts
}

export const SOCIALS = [
  { key: 'instagram', label: 'Instagram', url: (h: string) => `https://instagram.com/${h}` },
  { key: 'tiktok', label: 'TikTok', url: (h: string) => `https://www.tiktok.com/@${h}` },
  { key: 'x', label: 'X', url: (h: string) => `https://x.com/${h}` },
  { key: 'substack', label: 'Substack', url: (h: string) => `https://${h}.substack.com` },
] as const

export type SocialKey = (typeof SOCIALS)[number]['key']
export type Socials = Partial<Record<SocialKey, string>>

/** Accepts "@ada", "ada" or a profile link, and keeps just the handle. */
export function cleanSocialHandle(key: SocialKey, input: string): string | null {
  let v = input.trim()
  if (!v) return null
  try {
    if (/^https?:\/\//i.test(v) || /\.(com|net)\//i.test(v)) {
      const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
      if (key === 'substack' && url.hostname.endsWith('.substack.com')) v = url.hostname.split('.')[0]
      else v = url.pathname.split('/').filter(Boolean)[0] ?? ''
    }
  } catch {
    // Not a link; treat it as a handle.
  }
  v = v.replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40)
  return v || null
}
