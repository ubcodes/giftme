import { randomBytes } from 'node:crypto'
import { recordOfflineGift, recordPendingGift, recordSplit, settlePendingGift } from './blnk'
import { one, query, run } from './db'
import { sendEmail } from './email'
import { UserError } from './errors'
import { initializePayment, listBanks, resolveAccount, upsertSubaccount, type PaystackStatus } from './paystack'
import { getUserRow, toProfile } from './users'
import {
  balanceFor,
  listItems,
  ownedItem,
  ownedWishlist,
  progressFor,
  reservedIds,
  type ItemRow,
  type ItemState,
  type WishlistRow,
} from './wishlists'

export const MIN_CONTRIBUTION_NGN = 500

export function platformFeePercent() {
  const pct = Number(process.env.PLATFORM_FEE_PERCENT ?? 0)
  return Number.isFinite(pct) && pct >= 0 && pct < 50 ? pct : 0
}

export function siteUrl() {
  return (process.env.PUBLIC_SITE_URL ?? 'http://localhost:3200').replace(/\/$/, '')
}

// --- Public view -----------------------------------------------------------------------

/** What guests see: progress only, never names or amounts. */
export type PublicItem = {
  id: string
  kind: 'gift' | 'fund'
  title: string
  priceNgn: number | null
  priceUsd: number | null
  link: string | null
  imageUrl: string | null
  note: string | null
  canReserve: boolean
  canContribute: boolean
  percent: number | null
  remainingNgn: number | null
  state: ItemState
}

/** Google's own product pages need a consent screen that breaks for many guests; don't link to them. */
function shopLink(link: string | null) {
  if (!link) return null
  try {
    return /(^|\.)google\./.test(new URL(link).hostname) ? null : link
  } catch {
    return null
  }
}

async function publicItems(items: ItemRow[]): Promise<PublicItem[]> {
  const reserved = await reservedIds(items.map((i) => i.id))
  return Promise.all(
    items.map(async (item) => {
      const p = await progressFor(item, reserved)
      return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        priceNgn: item.price_ngn,
        priceUsd: item.price_usd,
        link: shopLink(item.link),
        imageUrl: item.image_url,
        note: item.note,
        canReserve: p.canReserve,
        canContribute: p.canContribute,
        percent: p.percent,
        remainingNgn: p.remainingNgn,
        state: p.state,
      }
    }),
  )
}

export async function publicWishlist(handle: string, slug: string) {
  const owner = await one<{ id: string }>('SELECT id FROM users WHERE handle = ?', [handle.toLowerCase()])
  if (!owner) return null
  const wl = await one<WishlistRow>('SELECT * FROM wishlists WHERE owner_id = ? AND slug = ?', [owner.id, slug])
  if (!wl) return null
  const row = (await getUserRow(owner.id))!
  return {
    owner: { displayName: row.display_name, handle: row.handle!, avatarUrl: row.avatar_url },
    acceptsMoney: !!row.paystack_subaccount,
    wishlist: {
      id: wl.id,
      slug: wl.slug,
      occasion: wl.occasion,
      title: wl.title,
      eventDate: wl.event_date,
      intro: wl.intro,
      coverUrl: wl.cover_url,
    },
    items: await publicItems(await listItems(wl.id, false)),
  }
}

export async function publicProfile(handle: string) {
  const owner = await one<{ id: string; display_name: string; handle: string; avatar_url: string | null }>(
    'SELECT id, display_name, handle, avatar_url FROM users WHERE handle = ?',
    [handle.toLowerCase()],
  )
  if (!owner) return null
  const lists = await query<WishlistRow>('SELECT * FROM wishlists WHERE owner_id = ? ORDER BY created_at DESC', [owner.id])
  return {
    owner: { displayName: owner.display_name, handle: owner.handle, avatarUrl: owner.avatar_url },
    wishlists: lists.map((w) => ({ slug: w.slug, title: w.title, occasion: w.occasion, eventDate: w.event_date })),
  }
}

async function findPublicItem(itemId: string) {
  const item = await one<ItemRow & { owner_id: string; wishlist_title: string; handle: string; slug: string }>(
    `SELECT items.*, wishlists.owner_id, wishlists.title AS wishlist_title, wishlists.slug, users.handle
     FROM items JOIN wishlists ON wishlists.id = items.wishlist_id JOIN users ON users.id = wishlists.owner_id
     WHERE items.id = ? AND items.hidden = 0`,
    [itemId],
  )
  if (!item) throw new UserError('That gift is no longer on the list.')
  return item
}

// --- Contributions ---------------------------------------------------------------------

export async function startContribution(input: { itemId: string; amountNgn: number; name?: string; email: string; message?: string }) {
  const item = await findPublicItem(input.itemId)
  const owner = (await getUserRow(item.owner_id))!
  if (!owner.paystack_subaccount) throw new UserError(`${owner.display_name.split(' ')[0]} hasn't set up payments yet. Please check back soon.`)

  const progress = await progressFor(item, await reservedIds([item.id]))
  if (progress.state !== 'open') throw new UserError('This gift is already taken care of. Thank you!')
  if (!progress.canContribute) throw new UserError('This gift can be reserved and bought, not paid toward.')

  const amountNgn = Math.round(input.amountNgn)
  if (amountNgn < MIN_CONTRIBUTION_NGN) throw new UserError(`The smallest contribution is ₦${MIN_CONTRIBUTION_NGN.toLocaleString()}.`)
  if (progress.remainingNgn !== null && amountNgn > progress.remainingNgn) {
    throw new UserError(`Only ₦${progress.remainingNgn.toLocaleString()} is left on this gift.`)
  }
  if (amountNgn > 10_000_000) throw new UserError('That amount is above the limit for one payment.')

  const amountKobo = amountNgn * 100
  const feeKobo = Math.floor((amountKobo * platformFeePercent()) / 100)
  const reference = `gm_${Date.now().toString(36)}_${randomBytes(5).toString('hex')}`
  const now = Date.now()
  await run(
    `INSERT INTO contributions (reference, item_id, wishlist_id, owner_id, amount_kobo, fee_kobo, name, email, message, source, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paystack', 'pending', ?, ?)`,
    [reference, item.id, item.wishlist_id, item.owner_id, amountKobo, feeKobo, input.name || null, input.email, input.message || null, now, now],
  )

  const txnId = await recordPendingGift({
    reference,
    balanceId: await balanceFor(item),
    amountKobo,
    meta: { item_id: item.id, wishlist_id: item.wishlist_id, owner_id: item.owner_id },
  })
  await run('UPDATE contributions SET blnk_txn_id = ? WHERE reference = ?', [txnId, reference])

  const payment = await initializePayment({
    reference,
    email: input.email,
    amountKobo,
    feeKobo,
    subaccount: owner.paystack_subaccount,
    callbackUrl: `${siteUrl()}/thank-you?w=${encodeURIComponent(`${item.handle}/${item.slug}`)}`,
    metadata: { item_id: item.id, item_title: item.title, wishlist_id: item.wishlist_id, owner_id: item.owner_id },
  })
  return { authorizationUrl: payment.authorization_url, reference }
}

/**
 * Settle a contribution once Paystack reports its outcome. Called from both the webhook and
 * the thank-you page, so it must be safe to run twice: the status flip to "settling" lets
 * only one caller through.
 */
export async function settleContribution(reference: string, paystackStatus: PaystackStatus, paidKobo: number) {
  const outcome = paystackStatus === 'success' ? 'commit' : paystackStatus === 'failed' || paystackStatus === 'reversed' ? 'void' : null
  if (!outcome) return 'pending'

  const claim = await run(`UPDATE contributions SET status = 'settling', updated_at = ? WHERE reference = ? AND status = 'pending'`, [
    Date.now(),
    reference,
  ])
  const row = await one<{
    status: string
    amount_kobo: number
    fee_kobo: number
    blnk_txn_id: string
    item_id: string
    wishlist_id: string
    owner_id: string
    name: string | null
    message: string | null
  }>('SELECT * FROM contributions WHERE reference = ?', [reference])
  if (!row) return 'unknown'
  if (claim.rowsAffected === 0) return row.status

  // Never credit more or less than what was actually paid.
  const mismatch = outcome === 'commit' && paidKobo !== Number(row.amount_kobo)
  const finalOutcome = mismatch ? 'void' : outcome
  try {
    await settlePendingGift(row.blnk_txn_id, finalOutcome)
  } catch (err) {
    await run(`UPDATE contributions SET status = 'pending' WHERE reference = ?`, [reference])
    throw err
  }
  const finalStatus = mismatch ? 'amount_mismatch' : finalOutcome === 'commit' ? 'success' : 'failed'
  await run('UPDATE contributions SET status = ?, updated_at = ? WHERE reference = ?', [finalStatus, Date.now(), reference])

  if (finalStatus === 'success') {
    // The payment is safely recorded. If mirroring the split fails, reconcileSplits picks
    // it up later; the Blnk references make it happen exactly once.
    await recordSplitFor(reference).catch((err) => console.error('[blnk] split failed, will retry', reference, err))
    const item = await one<{ title: string }>('SELECT title FROM items WHERE id = ?', [row.item_id])
    void notifyOwner(row.owner_id, item?.title ?? 'a gift', Number(row.amount_kobo), row.name, row.message)
  }
  return finalStatus
}

async function recordSplitFor(reference: string) {
  const c = await one<{ item_id: string; wishlist_id: string; owner_id: string; amount_kobo: number; fee_kobo: number }>(
    `SELECT * FROM contributions WHERE reference = ? AND status = 'success' AND source = 'paystack' AND split_at IS NULL`,
    [reference],
  )
  if (!c) return
  const item = await one<ItemRow>('SELECT * FROM items WHERE id = ?', [c.item_id])
  if (!item) return
  await recordSplit({
    reference,
    balanceId: await balanceFor(item),
    amountKobo: Number(c.amount_kobo),
    feeKobo: Number(c.fee_kobo),
    meta: { item_id: c.item_id, wishlist_id: c.wishlist_id, owner_id: c.owner_id, paystack_reference: reference },
  })
  await run('UPDATE contributions SET split_at = ? WHERE reference = ?', [Date.now(), reference])
}

/** Retries any payout/fee entries that failed to record right after a payment. */
export async function reconcileSplits(ownerId: string) {
  const rows = await query<{ reference: string }>(
    `SELECT reference FROM contributions WHERE owner_id = ? AND status = 'success' AND source = 'paystack' AND split_at IS NULL`,
    [ownerId],
  )
  for (const r of rows) await recordSplitFor(r.reference).catch((err) => console.error('[blnk] split retry failed', r.reference, err))
}

async function notifyOwner(ownerId: string, itemTitle: string, amountKobo: number, name: string | null, message: string | null) {
  const owner = await getUserRow(ownerId)
  if (!owner?.email) return
  const amount = `₦${(amountKobo / 100).toLocaleString('en-NG')}`
  await sendEmail({
    to: owner.email,
    subject: `${name ?? 'Someone'} gave ${amount} toward ${itemTitle}`,
    text: [
      `Hi ${owner.display_name.split(' ')[0]},`,
      '',
      `${name ?? 'A friend'} just gave ${amount} toward "${itemTitle}".`,
      message ? `\nTheir note: "${message}"\n` : '',
      `It will be settled to your bank account. See every gift on your dashboard: ${siteUrl()}/dashboard`,
      '',
      'GiftMe',
    ].join('\n'),
  })
}

export async function reserveItem(input: { itemId: string; name: string; email?: string; note?: string }) {
  const item = await findPublicItem(input.itemId)
  const progress = await progressFor(item, await reservedIds([item.id]))
  if (!progress.canReserve || progress.state !== 'open') throw new UserError('This gift can no longer be reserved.')
  const rs = await run('INSERT OR IGNORE INTO reservations (item_id, name, email, note, created_at) VALUES (?, ?, ?, ?, ?)', [
    item.id,
    input.name,
    input.email || null,
    input.note || null,
    Date.now(),
  ])
  if (rs.rowsAffected === 0) throw new UserError('Someone just reserved this one.')
}

// --- Owner tools -----------------------------------------------------------------------

export async function addOfflineGift(ownerId: string, input: { itemId: string; amountNgn: number; name?: string; note?: string }) {
  const item = await ownedItem(ownerId, input.itemId)
  const amountKobo = Math.round(input.amountNgn * 100)
  const reference = `gm_offline_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
  const txnId = await recordOfflineGift({
    reference,
    balanceId: await balanceFor(item),
    amountKobo,
    note: input.note,
    meta: { item_id: item.id, wishlist_id: item.wishlist_id, owner_id: ownerId },
  })
  const now = Date.now()
  await run(
    `INSERT INTO contributions (reference, item_id, wishlist_id, owner_id, amount_kobo, name, email, message, source, status, blnk_txn_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '', ?, 'offline', 'success', ?, ?, ?)`,
    [reference, item.id, item.wishlist_id, ownerId, amountKobo, input.name || null, input.note || null, txnId, now, now],
  )
}

export async function cancelReservation(ownerId: string, itemId: string) {
  await ownedItem(ownerId, itemId)
  await run('DELETE FROM reservations WHERE item_id = ?', [itemId])
}

export async function sendThankYou(ownerId: string, reference: string, note: string) {
  const c = await one<{ email: string; name: string | null; item_id: string; source: string }>(
    `SELECT email, name, item_id, source FROM contributions WHERE reference = ? AND owner_id = ? AND status = 'success'`,
    [reference, ownerId],
  )
  if (!c) throw new UserError('That gift was not found.')
  if (!c.email) throw new UserError('This gift has no email address to send to.')
  const owner = (await getUserRow(ownerId))!
  const item = await one<{ title: string }>('SELECT title FROM items WHERE id = ?', [c.item_id])
  await sendEmail({
    to: c.email,
    subject: `A thank-you from ${owner.display_name}`,
    text: `${c.name ? `Dear ${c.name},` : 'Hello,'}\n\n${note}\n\n${owner.display_name}\n\n(For your gift toward "${item?.title ?? 'the wishlist'}", sent with GiftMe.)`,
    replyTo: owner.email ?? undefined,
  })
  await run('UPDATE contributions SET thanked_at = ? WHERE reference = ?', [Date.now(), reference])
}

export async function ownerWishlistDetail(ownerId: string, wishlistId: string) {
  const wl = await ownedWishlist(ownerId, wishlistId)
  const items = await listItems(wl.id, true)
  const reserved = await reservedIds(items.map((i) => i.id))
  const [withProgress, contributions, reservations] = await Promise.all([
    Promise.all(items.map(async (item) => ({ item, progress: await progressFor(item, reserved) }))),
    query<Record<string, unknown>>(
      `SELECT * FROM contributions WHERE wishlist_id = ? AND status IN ('success', 'pending', 'amount_mismatch') ORDER BY created_at DESC`,
      [wl.id],
    ),
    query<Record<string, unknown>>(
      `SELECT reservations.*, items.title FROM reservations JOIN items ON items.id = reservations.item_id
       WHERE items.wishlist_id = ? ORDER BY reservations.created_at DESC`,
      [wl.id],
    ),
  ])
  const titles = new Map(items.map((i) => [i.id, i.title]))
  return {
    wishlist: {
      id: wl.id,
      slug: wl.slug,
      occasion: wl.occasion,
      title: wl.title,
      eventDate: wl.event_date,
      intro: wl.intro,
      coverUrl: wl.cover_url,
    },
    items: withProgress.map(({ item, progress }) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      priceNgn: item.price_ngn,
      priceUsd: item.price_usd,
      imageUrl: item.image_url,
      link: item.link,
      note: item.note,
      allowReserve: !!item.allow_reserve,
      allowMoney: item.kind === 'fund' || !!item.money_enabled,
      hidden: !!item.hidden,
      received: !!item.received,
      hasBalance: !!item.blnk_balance_id,
      raisedNgn: progress.raisedKobo / 100,
      paidOutNgn: progress.paidOutKobo / 100,
      percent: progress.percent,
      state: progress.state,
      reserved: progress.reserved,
    })),
    contributions: contributions.map((r) => ({
      reference: r.reference as string,
      itemId: r.item_id as string,
      item: titles.get(r.item_id as string) ?? 'Removed item',
      amountNgn: Number(r.amount_kobo) / 100,
      name: (r.name as string | null) ?? null,
      email: (r.email as string | null) || null,
      message: (r.message as string | null) ?? null,
      source: r.source as string,
      status: r.status as string,
      thanked: !!r.thanked_at,
      createdAt: Number(r.created_at),
    })),
    reservations: reservations.map((r) => ({
      itemId: r.item_id as string,
      item: r.title as string,
      name: r.name as string,
      email: (r.email as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      createdAt: Number(r.created_at),
    })),
  }
}

export async function ownerOverview(ownerId: string) {
  const lists = await query<WishlistRow>('SELECT * FROM wishlists WHERE owner_id = ? ORDER BY created_at DESC', [ownerId])
  const totals = await query<{ wishlist_id: string; n: number; total: number }>(
    `SELECT wishlist_id, COUNT(*) AS n, SUM(amount_kobo) AS total FROM contributions
     WHERE owner_id = ? AND status = 'success' GROUP BY wishlist_id`,
    [ownerId],
  )
  const counts = await query<{ wishlist_id: string; n: number }>(
    `SELECT wishlist_id, COUNT(*) AS n FROM items WHERE wishlist_id IN (SELECT id FROM wishlists WHERE owner_id = ?) GROUP BY wishlist_id`,
    [ownerId],
  )
  const byList = new Map(totals.map((t) => [t.wishlist_id, t]))
  const itemCounts = new Map(counts.map((c) => [c.wishlist_id, Number(c.n)]))
  // Totals come from Blnk balances, the source of truth for money.
  const raised = await Promise.all(
    lists.map(async (wl) => {
      const items = await listItems(wl.id, true)
      const progress = await Promise.all(items.map((i) => progressFor(i, new Set())))
      return progress.reduce((sum, p) => sum + p.raisedKobo, 0) / 100
    }),
  )
  return lists.map((wl, i) => ({
    id: wl.id,
    slug: wl.slug,
    title: wl.title,
    occasion: wl.occasion,
    eventDate: wl.event_date,
    coverUrl: wl.cover_url,
    items: itemCounts.get(wl.id) ?? 0,
    gifts: Number(byList.get(wl.id)?.n ?? 0),
    raisedNgn: raised[i],
  }))
}

// --- Payout account --------------------------------------------------------------------

export async function bankList() {
  return listBanks()
}

export async function lookupAccount(accountNumber: string, bankCode: string) {
  try {
    const res = await resolveAccount(accountNumber, bankCode)
    return { accountName: res.account_name }
  } catch {
    throw new UserError("We couldn't find that account. Please check the number and bank.")
  }
}

export async function savePayoutAccount(ownerId: string, input: { bankCode: string; accountNumber: string }) {
  const owner = await getUserRow(ownerId)
  if (!owner) throw new UserError('Please sign in first.')
  const banks = await listBanks()
  const bank = banks.find((b) => b.code === input.bankCode)
  if (!bank) throw new UserError('Please pick your bank from the list.')
  const { accountName } = await lookupAccount(input.accountNumber, input.bankCode)
  const code = await upsertSubaccount({
    existingCode: owner.paystack_subaccount,
    businessName: `${owner.display_name} (GiftMe)`,
    bankCode: bank.code,
    accountNumber: input.accountNumber,
    percentageCharge: platformFeePercent(),
    email: owner.email,
    ownerId,
  })
  await run(
    `UPDATE users SET paystack_subaccount = ?, bank_name = ?, bank_code = ?, account_last4 = ?, account_name = ? WHERE id = ?`,
    [code, bank.name, bank.code, input.accountNumber.slice(-4), accountName, ownerId],
  )
  return toProfile((await getUserRow(ownerId))!)
}
