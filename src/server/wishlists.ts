import { randomBytes } from 'node:crypto'
import { createItemBalance, createOwnerIdentity, getBalanceSummary, type BalanceSummary } from './blnk'
import { one, query, run } from './db'
import { UserError } from './errors'
import { copyRemoteImage } from './storage'
import { getUserRow } from './users'

// Wishlists and the items on them. Money moves in gifts.ts; progress is read from Blnk.

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(5).toString('hex')}`
}

export type WishlistRow = {
  id: string
  owner_id: string
  slug: string
  occasion: string
  title: string
  event_date: string | null
  intro: string | null
  cover_url: string | null
  created_at: number
}

export type ItemRow = {
  id: string
  wishlist_id: string
  kind: 'gift' | 'fund'
  title: string
  price_ngn: number | null
  price_usd: number | null
  image_url: string | null
  source_image_url: string | null
  link: string | null
  note: string | null
  allow_reserve: number
  money_enabled: number
  hidden: number
  received: number
  position: number
  blnk_balance_id: string | null
}

export type ItemState = 'open' | 'reserved' | 'funded'

export type ItemProgress = {
  raisedKobo: number
  paidOutKobo: number
  percent: number | null
  remainingNgn: number | null
  state: ItemState
  canReserve: boolean
  canContribute: boolean
  reserved: boolean
}

// --- Slugs -----------------------------------------------------------------------------

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'wishlist'
  )
}

async function uniqueSlug(ownerId: string, title: string, exceptId?: string) {
  const base = slugify(title)
  for (let i = 1; i < 100; i++) {
    const slug = i === 1 ? base : `${base}-${i}`
    const taken = await one<{ id: string }>('SELECT id FROM wishlists WHERE owner_id = ? AND slug = ?', [ownerId, slug])
    if (!taken || taken.id === exceptId) return slug
  }
  return `${base}-${Date.now().toString(36)}`
}

// --- Wishlists -------------------------------------------------------------------------

export type WishlistInput = {
  occasion: string
  title: string
  eventDate: string | null
  intro: string | null
  coverUrl: string | null
}

export async function createWishlist(ownerId: string, input: WishlistInput) {
  const id = newId('wl')
  const slug = await uniqueSlug(ownerId, input.title)
  await run(
    `INSERT INTO wishlists (id, owner_id, slug, occasion, title, event_date, intro, cover_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, ownerId, slug, input.occasion, input.title, input.eventDate, input.intro, input.coverUrl, Date.now()],
  )
  return { id, slug }
}

export async function ownedWishlist(ownerId: string, wishlistId: string) {
  const wl = await one<WishlistRow>('SELECT * FROM wishlists WHERE id = ? AND owner_id = ?', [wishlistId, ownerId])
  if (!wl) throw new UserError('That wishlist was not found.')
  return wl
}

export async function updateWishlist(ownerId: string, wishlistId: string, input: WishlistInput & { slug?: string }) {
  await ownedWishlist(ownerId, wishlistId)
  const slug = input.slug ? await uniqueSlug(ownerId, input.slug, wishlistId) : undefined
  await run(
    `UPDATE wishlists SET occasion = ?, title = ?, event_date = ?, intro = ?, cover_url = ?, slug = COALESCE(?, slug)
     WHERE id = ? AND owner_id = ?`,
    [input.occasion, input.title, input.eventDate, input.intro, input.coverUrl, slug ?? null, wishlistId, ownerId],
  )
}

export async function deleteWishlist(ownerId: string, wishlistId: string) {
  await ownedWishlist(ownerId, wishlistId)
  const paid = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM contributions WHERE wishlist_id = ? AND status IN ('success', 'pending', 'settling')`,
    [wishlistId],
  )
  if (Number(paid?.n ?? 0) > 0) throw new UserError('This wishlist has received gifts, so it can only be hidden, not deleted.')
  await run('DELETE FROM reservations WHERE item_id IN (SELECT id FROM items WHERE wishlist_id = ?)', [wishlistId])
  await run('DELETE FROM contributions WHERE wishlist_id = ?', [wishlistId])
  await run('DELETE FROM items WHERE wishlist_id = ?', [wishlistId])
  await run('DELETE FROM wishlists WHERE id = ?', [wishlistId])
}

export async function listItems(wishlistId: string, includeHidden: boolean) {
  return query<ItemRow>(
    `SELECT * FROM items WHERE wishlist_id = ? ${includeHidden ? '' : 'AND hidden = 0'} ORDER BY position, created_at`,
    [wishlistId],
  )
}

// --- Blnk balances ---------------------------------------------------------------------

const balanceCreation = new Map<string, Promise<string>>()

async function ensureIdentity(ownerId: string) {
  const owner = await getUserRow(ownerId)
  if (!owner) throw new Error(`Owner ${ownerId} missing`)
  if (owner.blnk_identity_id) return owner.blnk_identity_id
  const identityId = await createOwnerIdentity({
    id: owner.id,
    displayName: owner.display_name,
    email: owner.email,
    handle: owner.handle,
  })
  await run('UPDATE users SET blnk_identity_id = COALESCE(blnk_identity_id, ?) WHERE id = ?', [identityId, ownerId])
  return (await getUserRow(ownerId))!.blnk_identity_id!
}

/** One Blnk balance per item, created on first need, even if two requests arrive at once. */
export async function balanceFor(item: Pick<ItemRow, 'id' | 'title' | 'kind' | 'wishlist_id' | 'blnk_balance_id'>) {
  if (item.blnk_balance_id) return item.blnk_balance_id
  const saved = await one<{ blnk_balance_id: string | null }>('SELECT blnk_balance_id FROM items WHERE id = ?', [item.id])
  if (saved?.blnk_balance_id) return saved.blnk_balance_id

  let pending = balanceCreation.get(item.id)
  if (!pending) {
    pending = (async () => {
      const wl = await one<{ owner_id: string }>('SELECT owner_id FROM wishlists WHERE id = ?', [item.wishlist_id])
      if (!wl) throw new Error('Wishlist missing')
      const balanceId = await createItemBalance({
        identityId: await ensureIdentity(wl.owner_id),
        ownerId: wl.owner_id,
        wishlistId: item.wishlist_id,
        itemId: item.id,
        title: item.title,
        kind: item.kind,
      })
      await run('UPDATE items SET blnk_balance_id = COALESCE(blnk_balance_id, ?) WHERE id = ?', [balanceId, item.id])
      const again = await one<{ blnk_balance_id: string }>('SELECT blnk_balance_id FROM items WHERE id = ?', [item.id])
      return again!.blnk_balance_id
    })().finally(() => balanceCreation.delete(item.id))
    balanceCreation.set(item.id, pending)
  }
  return pending
}

const EMPTY: BalanceSummary = { raisedKobo: 0, paidOutKobo: 0, heldKobo: 0, pendingKobo: 0 }

async function summaryFor(item: ItemRow) {
  // Items nobody has given to yet have no balance; don't create one just to read zero.
  if (!item.blnk_balance_id) return EMPTY
  try {
    return await getBalanceSummary(item.blnk_balance_id)
  } catch (err) {
    console.error('[blnk] balance read failed', item.id, err)
    return EMPTY
  }
}

export async function reservedIds(itemIds: string[]) {
  if (itemIds.length === 0) return new Set<string>()
  const rows = await query<{ item_id: string }>(
    `SELECT item_id FROM reservations WHERE item_id IN (${itemIds.map(() => '?').join(',')})`,
    itemIds,
  )
  return new Set(rows.map((r) => r.item_id))
}

export async function progressFor(item: ItemRow, reserved: Set<string>): Promise<ItemProgress> {
  const s = await summaryFor(item)
  const priceKobo = item.price_ngn ? item.price_ngn * 100 : null
  const funded = priceKobo !== null && s.raisedKobo >= priceKobo
  const isReserved = reserved.has(item.id)
  return {
    raisedKobo: s.raisedKobo,
    paidOutKobo: s.paidOutKobo,
    percent: priceKobo ? Math.min(100, Math.floor((s.raisedKobo / priceKobo) * 100)) : null,
    remainingNgn: priceKobo ? Math.max(0, Math.ceil((priceKobo - s.raisedKobo) / 100)) : null,
    state: funded || (item.received && item.kind === 'gift') ? 'funded' : isReserved ? 'reserved' : 'open',
    // Reserving means a guest buys the thing themselves, so only gifts, and only before any money is in.
    canReserve: item.kind === 'gift' && !!item.allow_reserve && s.raisedKobo === 0 && !isReserved,
    canContribute: item.kind === 'fund' || !!item.money_enabled,
    reserved: isReserved,
  }
}

// --- Items -----------------------------------------------------------------------------

export type ItemInput = {
  kind: 'gift' | 'fund'
  title: string
  priceNgn: number | null
  priceUsd: number | null
  imageUrl: string | null
  link: string | null
  note: string | null
  allowReserve: boolean
  allowMoney: boolean
}

export async function ownedItem(ownerId: string, itemId: string) {
  const item = await one<ItemRow & { owner_id: string }>(
    `SELECT items.*, wishlists.owner_id FROM items JOIN wishlists ON wishlists.id = items.wishlist_id
     WHERE items.id = ? AND wishlists.owner_id = ?`,
    [itemId, ownerId],
  )
  if (!item) throw new UserError('That item was not found.')
  return item
}

function validateItem(input: ItemInput) {
  if (input.kind === 'gift' && (!input.priceNgn || input.priceNgn < 100)) throw new UserError('Add a price of at least ₦100.')
  if (input.kind === 'gift' && !input.allowMoney && !input.allowReserve) {
    throw new UserError('Let guests chip in, buy it themselves, or both.')
  }
  if (input.priceNgn !== null && input.priceNgn > 100_000_000) throw new UserError('That price looks too high.')
}

/** Keeps a copy of a remote image so the item survives the shop changing its pictures. */
function copyImageLater(itemId: string, url: string | null) {
  if (!url || url.startsWith('/media/')) return
  void copyRemoteImage(url).then(async (stored) => {
    if (stored) await run('UPDATE items SET image_url = ? WHERE id = ? AND source_image_url = ?', [stored, itemId, url])
  })
}

/** Inline (data:) images are stored right away rather than kept in the database. */
async function storeInlineImage(input: ItemInput): Promise<ItemInput> {
  if (!input.imageUrl?.startsWith('data:')) return input
  return { ...input, imageUrl: await copyRemoteImage(input.imageUrl) }
}

export async function addItem(ownerId: string, wishlistId: string, raw: ItemInput) {
  await ownedWishlist(ownerId, wishlistId)
  validateItem(raw)
  const input = await storeInlineImage(raw)
  const id = newId('it')
  const last = await one<{ p: number | null }>('SELECT MAX(position) AS p FROM items WHERE wishlist_id = ?', [wishlistId])
  await run(
    `INSERT INTO items (id, wishlist_id, kind, title, price_ngn, price_usd, image_url, source_image_url, link, note,
                        allow_reserve, money_enabled, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      wishlistId,
      input.kind,
      input.title,
      input.priceNgn,
      input.priceUsd,
      input.imageUrl,
      input.imageUrl,
      input.link,
      input.note,
      input.kind === 'gift' && input.allowReserve ? 1 : 0,
      input.kind === 'fund' || input.allowMoney ? 1 : 0,
      Number(last?.p ?? -1) + 1,
      Date.now(),
    ],
  )
  copyImageLater(id, input.imageUrl)
  // Open the item's balance in Blnk right away so it shows up in the ledger. Not fatal:
  // it is created on first contribution otherwise.
  void one<ItemRow>('SELECT * FROM items WHERE id = ?', [id])
    .then((row) => row && balanceFor(row))
    .catch((err) => console.warn('[blnk] could not open balance yet', err instanceof Error ? err.message : err))
  return { id }
}

export async function updateItem(ownerId: string, itemId: string, raw: ItemInput) {
  const item = await ownedItem(ownerId, itemId)
  validateItem(raw)
  const input = await storeInlineImage(raw)
  const imageChanged = input.imageUrl !== item.image_url
  await run(
    `UPDATE items SET kind = ?, title = ?, price_ngn = ?, price_usd = ?, link = ?, note = ?, allow_reserve = ?, money_enabled = ?,
       image_url = ?, source_image_url = CASE WHEN ? THEN ? ELSE source_image_url END
     WHERE id = ?`,
    [
      input.kind,
      input.title,
      input.priceNgn,
      input.priceUsd,
      input.link,
      input.note,
      input.kind === 'gift' && input.allowReserve ? 1 : 0,
      input.kind === 'fund' || input.allowMoney ? 1 : 0,
      input.imageUrl,
      imageChanged ? 1 : 0,
      input.imageUrl,
      itemId,
    ],
  )
  if (imageChanged) copyImageLater(itemId, input.imageUrl)
}

export async function setItemFlags(ownerId: string, itemId: string, flags: { hidden?: boolean; received?: boolean }) {
  await ownedItem(ownerId, itemId)
  if (flags.hidden !== undefined) await run('UPDATE items SET hidden = ? WHERE id = ?', [flags.hidden ? 1 : 0, itemId])
  if (flags.received !== undefined) await run('UPDATE items SET received = ? WHERE id = ?', [flags.received ? 1 : 0, itemId])
}

export async function deleteItem(ownerId: string, itemId: string) {
  await ownedItem(ownerId, itemId)
  const paid = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM contributions WHERE item_id = ? AND status IN ('success', 'pending', 'settling')`,
    [itemId],
  )
  if (Number(paid?.n ?? 0) > 0) throw new UserError('People have given toward this one, so it can be hidden but not deleted.')
  await run('DELETE FROM reservations WHERE item_id = ?', [itemId])
  await run('DELETE FROM items WHERE id = ?', [itemId])
}

export async function reorderItems(ownerId: string, wishlistId: string, orderedIds: string[]) {
  await ownedWishlist(ownerId, wishlistId)
  const items = await listItems(wishlistId, true)
  const known = new Set(items.map((i) => i.id))
  const order = orderedIds.filter((id) => known.has(id))
  for (const [i, id] of order.entries()) {
    await run('UPDATE items SET position = ? WHERE id = ? AND wishlist_id = ?', [i, id, wishlistId])
  }
}
