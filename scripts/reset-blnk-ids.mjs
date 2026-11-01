// Forgets the Blnk ledger, identity and balance IDs stored in GiftMe's database, so they are
// created again in whichever Blnk Core BLNK_URL now points to. Use it after moving to a new
// Blnk (e.g. from local Docker to Brimble). Wishlists, items and gift records are kept.
import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.DATABASE_URL ?? 'file:giftme.db',
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
})

await db.batch(
  [
    `DELETE FROM settings WHERE key = 'blnk_ledger_id'`,
    `UPDATE users SET blnk_identity_id = NULL`,
    `UPDATE items SET blnk_balance_id = NULL`,
  ],
  'write',
)
console.log('Cleared stored Blnk IDs. Restart the app; they will be recreated in', process.env.BLNK_URL ?? 'the configured Blnk')
