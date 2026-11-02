import { createClient, type InValue } from '@libsql/client'

// App database for everything that isn't money: people, wishlists, items, who reserved what,
// and the private details (name, note) behind each payment. The money itself lives in Blnk.
export const db = createClient({
  url: process.env.DATABASE_URL ?? 'file:giftme.db',
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
})

let ready: Promise<void> | null = null

export function initDb() {
  ready ??= db
    .batch(
      [
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT,
          display_name TEXT NOT NULL,
          handle TEXT UNIQUE,
          avatar_url TEXT,
          blnk_identity_id TEXT,
          paystack_subaccount TEXT,
          bank_name TEXT,
          bank_code TEXT,
          account_last4 TEXT,
          account_name TEXT,
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS wishlists (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL REFERENCES users(id),
          slug TEXT NOT NULL,
          occasion TEXT NOT NULL,
          title TEXT NOT NULL,
          event_date TEXT,
          intro TEXT,
          cover_url TEXT,
          created_at INTEGER NOT NULL,
          UNIQUE (owner_id, slug)
        )`,
        `CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          wishlist_id TEXT NOT NULL REFERENCES wishlists(id),
          kind TEXT NOT NULL DEFAULT 'gift',
          title TEXT NOT NULL,
          price_ngn INTEGER,
          price_usd REAL,
          image_url TEXT,
          source_image_url TEXT,
          link TEXT,
          note TEXT,
          allow_reserve INTEGER NOT NULL DEFAULT 1,
          money_enabled INTEGER NOT NULL DEFAULT 1,
          most_wanted INTEGER NOT NULL DEFAULT 0,
          hidden INTEGER NOT NULL DEFAULT 0,
          received INTEGER NOT NULL DEFAULT 0,
          position INTEGER NOT NULL DEFAULT 0,
          blnk_balance_id TEXT,
          created_at INTEGER NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_items_wishlist ON items(wishlist_id, position)`,
        `CREATE TABLE IF NOT EXISTS contributions (
          reference TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          wishlist_id TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          amount_kobo INTEGER NOT NULL,
          fee_kobo INTEGER NOT NULL DEFAULT 0,
          name TEXT,
          email TEXT NOT NULL,
          message TEXT,
          source TEXT NOT NULL DEFAULT 'paystack',
          status TEXT NOT NULL,
          blnk_txn_id TEXT,
          thanked_at INTEGER,
          split_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_contrib_item ON contributions(item_id)`,
        `CREATE INDEX IF NOT EXISTS idx_contrib_owner ON contributions(owner_id, created_at)`,
        `CREATE TABLE IF NOT EXISTS reservations (
          item_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          note TEXT,
          created_at INTEGER NOT NULL
        )`,
      ],
      'write',
    )
    .then(() => migrate())
    .catch((err) => {
      ready = null
      throw err
    })
  return ready
}

// Columns added after the first release. SQLite has no ADD COLUMN IF NOT EXISTS, so ignore
// the "duplicate column" error on databases that already have them.
const MIGRATIONS = [
  `ALTER TABLE items ADD COLUMN money_enabled INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE items ADD COLUMN most_wanted INTEGER NOT NULL DEFAULT 0`,
  // Finding friends: contact details are matched by hash, and only for people who opt in.
  `ALTER TABLE users ADD COLUMN phone TEXT`,
  `ALTER TABLE users ADD COLUMN phone_hash TEXT`,
  `ALTER TABLE users ADD COLUMN email_hash TEXT`,
  `ALTER TABLE users ADD COLUMN discoverable INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN instagram TEXT`,
  `ALTER TABLE users ADD COLUMN tiktok TEXT`,
  `ALTER TABLE users ADD COLUMN x_handle TEXT`,
  `ALTER TABLE users ADD COLUMN substack TEXT`,
  `CREATE TABLE IF NOT EXISTS follows (
     follower_id TEXT NOT NULL,
     followee_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     PRIMARY KEY (follower_id, followee_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash)`,
]

async function migrate() {
  for (const sql of MIGRATIONS) {
    try {
      await db.execute(sql)
    } catch (err) {
      if (!/duplicate column/i.test(String(err))) throw err
    }
  }
}

export async function query<T = Record<string, unknown>>(sql: string, args: InValue[] = []) {
  await initDb()
  const rs = await db.execute({ sql, args })
  return rs.rows as unknown as T[]
}

export async function one<T = Record<string, unknown>>(sql: string, args: InValue[] = []) {
  return (await query<T>(sql, args))[0] ?? null
}

export async function run(sql: string, args: InValue[] = []) {
  await initDb()
  return db.execute({ sql, args })
}

export async function getSetting(key: string) {
  const row = await one<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
  return row?.value ?? null
}

export async function setSetting(key: string, value: string) {
  await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value])
}
