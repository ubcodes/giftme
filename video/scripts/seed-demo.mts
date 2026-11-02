// Seeds a separate demo database (video/demo.db) with Amaka & Tobi's wedding wishlist, real
// ledger balances on the local Blnk and a few gifts, so the film can capture real screens.
//   DATABASE_URL=file:video/demo.db node --env-file=<local blnk env> ... npx tsx video/scripts/seed-demo.mts
import { createHmac } from 'node:crypto'
import { initDb, one, run } from '../../src/server/db.ts'
import { recordPendingGift, settlePendingGift } from '../../src/server/blnk.ts'
import { addItem, balanceFor, createWishlist, type ItemRow } from '../../src/server/wishlists.ts'

if (!process.env.DATABASE_URL?.includes('demo.db')) throw new Error('Refusing to seed anything but the demo database')
await initDb()

const email = 'amaka@giftme.demo'
const ownerId = `dev_${createHmac('sha256', 'giftme-dev-id').update(email).digest('hex').slice(0, 16)}`
await run(
  `INSERT OR REPLACE INTO users (id, email, display_name, handle, avatar_url, paystack_subaccount, bank_name, bank_code, account_last4, account_name, created_at)
   VALUES (?, ?, 'Amaka Obi', 'amaka', '/images/demo/couple.jpg', 'ACCT_demo', 'Zenith Bank', '057', '4821', 'AMAKA OBI', ?)`,
  [ownerId, email, Date.now()],
)

const { id: wishlistId } = await createWishlist(ownerId, {
  occasion: 'wedding',
  title: 'Amaka & Tobi’s wedding',
  eventDate: '2026-12-12',
  intro: 'We can’t wait to celebrate with you. If you’d like to send a gift, here are a few things we’d love for our new home.',
  coverUrl: '/images/demo/couple.jpg',
})

const ITEMS = [
  { kind: 'gift', title: 'Kenwood stand mixer', priceNgn: 180000, imageUrl: '/images/demo/mixer.jpg', mostWanted: true, gifts: [['Chioma A.', 20000, 'Happy married life! 💐'], ['Tunde', 40000, 'For all the cakes 🎂'], ['Kemi', 35000, null]] },
  { kind: 'fund', title: 'Honeymoon in Zanzibar', priceNgn: 1200000, imageUrl: '/images/demo/beach.jpg', mostWanted: true, gifts: [['Aunty Ngozi', 150000, 'Enjoy every moment, my darlings'], ['Ife', 50000, 'Bring me sand 😂'], ['Bayo & Funmi', 100000, 'Congrats you two!'], ['Uncle Segun', 80000, null]] },
  { kind: 'gift', title: 'Polaroid instant camera', priceNgn: 96000, imageUrl: '/images/demo/camera.jpg', mostWanted: false, gifts: [['Dami', 96000, 'Take ALL the pictures 📸']] },
  { kind: 'gift', title: 'Pour-over coffee set', priceNgn: 45000, imageUrl: '/images/demo/pour-over.jpg', mostWanted: false, gifts: [['Ife', 20000, 'For your morning coffee ☕️']] },
  { kind: 'gift', title: 'Over-ear headphones', priceNgn: 45500, imageUrl: '/images/demo/headphones.jpg', mostWanted: false, gifts: [] },
  { kind: 'gift', title: 'High-top leather sneakers', priceNgn: 52500, imageUrl: '/images/demo/sneakers.jpg', mostWanted: false, gifts: [] },
] as const

let n = 0
for (const it of ITEMS) {
  const { id } = await addItem(ownerId, wishlistId, {
    kind: it.kind,
    title: it.title,
    priceNgn: it.priceNgn,
    priceUsd: null,
    imageUrl: it.imageUrl,
    link: it.kind === 'gift' ? 'https://www.jumia.com.ng/' : null,
    note: null,
    allowReserve: true,
    allowMoney: true,
  })
  if (it.mostWanted) await run('UPDATE items SET most_wanted = 1 WHERE id = ?', [id])
  const item = (await one<ItemRow>('SELECT * FROM items WHERE id = ?', [id]))!
  const balanceId = await balanceFor(item)
  for (const [name, amount, message] of it.gifts) {
    const reference = `gm_demo_${Date.now().toString(36)}_${n++}`
    const txn = await recordPendingGift({ reference, balanceId, amountKobo: amount * 100, meta: { item_id: id, wishlist_id: wishlistId, owner_id: ownerId } })
    await settlePendingGift(txn, 'commit')
    const at = Date.now() - (40 - n) * 3600_000
    await run(
      `INSERT INTO contributions (reference, item_id, wishlist_id, owner_id, amount_kobo, fee_kobo, name, email, message, source, status, blnk_txn_id, thanked_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'paystack', 'success', ?, ?, ?, ?)`,
      [reference, id, wishlistId, ownerId, amount * 100, name, `${name.split(' ')[0].toLowerCase()}@giftme.demo`, message, txn, n % 3 === 0 ? null : at, at, at],
    )
  }
}
// One gift a friend is buying themselves.
const sneakers = await one<{ id: string }>("SELECT id FROM items WHERE title LIKE 'High-top%'")
await run('INSERT INTO reservations (item_id, name, email, note, created_at) VALUES (?, ?, ?, ?, ?)', [sneakers!.id, 'Tobi’s cousin', null, null, Date.now()])

console.log(JSON.stringify({ ownerId, wishlistId, cookie: `${ownerId}.${createHmac('sha256', 'giftme-local-dev').update(ownerId).digest('hex')}` }))
