// Adds a few friends to the demo database so the Friends page has people to find.
//   DATABASE_URL=file:video/demo.db npx tsx video/scripts/seed-friends.mts
import { createHmac } from 'node:crypto'
import { initDb, run } from '../../src/server/db.ts'
import { hashContact, normalizePhone } from '../../src/lib/contacts.ts'
import { createWishlist } from '../../src/server/wishlists.ts'

if (!process.env.DATABASE_URL?.includes('demo.db')) throw new Error('Refusing to seed anything but the demo database')
await initDb()
const idFor = (email: string) => `dev_${createHmac('sha256', 'giftme-dev-id').update(email).digest('hex').slice(0, 16)}`

const PEOPLE = [
  { email: 'amaka@giftme.demo', phone: '0809 555 0101', instagram: 'amaka.obi', tiktok: 'amakaandtobi', discoverable: 1 },
  { email: 'tunde@giftme.demo', name: 'Tunde Bakare', handle: 'tunde', phone: '0803 123 4567', instagram: 'tunde.eats', discoverable: 1, list: ['birthday', 'Tunde’s 30th', '2026-11-20'] },
  { email: 'kemi@giftme.demo', name: 'Kemi Adeyemi', handle: 'kemi', phone: '0812 222 3333', tiktok: 'kemicooks', discoverable: 1, list: ['baby', 'Baby Adeyemi is coming', '2027-01-15'] },
  { email: 'ife@giftme.demo', name: 'Ife Okafor', handle: 'ife', x: 'ife_writes', substack: 'ifewrites', discoverable: 1, list: ['graduation', 'Ife’s graduation', '2026-12-02'] },
  { email: 'dami@giftme.demo', name: 'Dami Cole', handle: 'dami', phone: '0701 999 8888', discoverable: 0, list: ['birthday', 'Dami turns 25', '2026-11-28'] },
] as const

for (const p of PEOPLE) {
  const id = idFor(p.email)
  const phone = 'phone' in p ? normalizePhone(p.phone) : null
  if ('name' in p) {
    await run(`INSERT OR IGNORE INTO users (id, email, display_name, handle, created_at) VALUES (?, ?, ?, ?, ?)`, [id, p.email, p.name, p.handle, Date.now()])
  }
  await run(
    `UPDATE users SET phone = ?, phone_hash = ?, email_hash = ?, discoverable = ?, instagram = ?, tiktok = ?, x_handle = ?, substack = ? WHERE id = ?`,
    [
      phone,
      phone ? await hashContact(phone) : null,
      await hashContact(p.email),
      p.discoverable,
      'instagram' in p ? p.instagram : null,
      'tiktok' in p ? p.tiktok : null,
      'x' in p ? p.x : null,
      'substack' in p ? p.substack : null,
      id,
    ],
  )
  if ('list' in p) {
    const [occasion, title, eventDate] = p.list
    await run('DELETE FROM wishlists WHERE owner_id = ?', [id])
    await createWishlist(id, { occasion, title, eventDate, intro: null, coverUrl: null })
  }
}
const cookie = (email: string) => {
  const id = idFor(email)
  return `${id}.${createHmac('sha256', 'giftme-local-dev').update(id).digest('hex')}`
}
console.log(JSON.stringify({ amaka: cookie('amaka@giftme.demo'), tunde: cookie('tunde@giftme.demo') }))
