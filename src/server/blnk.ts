import { getSetting, setSetting } from './db'

// All Blnk Core calls live here, so moving between local Docker, Brimble or Blnk Cloud is
// just a change of BLNK_URL and BLNK_SECRET_KEY.
//
// Ledger layout:
//   ledger "GiftMe"
//   ├─ identity per owner (meta: owner_id, handle)
//   ├─ balance per item or cash fund (identity_id, meta: owner_id, wishlist_id, item_id)
//   └─ internal balances:
//        @PaystackNGN      money arriving through Paystack (goes negative by design)
//        @OfflineGiftsNGN  gifts the owner recorded by hand
//        @GiftMeFeesNGN    optional platform fee (PLATFORM_FEE_PERCENT, default 0)
//        @Payouts          money settled to the owner's bank by their Paystack subaccount
//
// A guest payment is: @PaystackNGN → item (inflight) → commit on success / void on failure,
// then item → @GiftMeFeesNGN (fee, if any) and item → @Payouts (the rest). An item's
// credit_balance is what was raised; its balance is what hasn't been paid out yet.

const CURRENCY = 'NGN'
// Amounts are stored in kobo: ₦1 = 100.
const PRECISION = 100
const LEDGER_NAME = 'GiftMe'

export const INTERNAL = {
  paystack: '@PaystackNGN',
  offline: '@OfflineGiftsNGN',
  fees: '@GiftMeFeesNGN',
  payouts: '@Payouts',
} as const

type BlnkBalance = {
  balance_id: string
  balance: number
  credit_balance: number
  debit_balance: number
  inflight_credit_balance: number
}

type BlnkTransaction = {
  transaction_id: string
  status: string
  reference: string
}

export class BlnkError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message)
  }
}

async function blnk<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const base = process.env.BLNK_URL
  const key = process.env.BLNK_SECRET_KEY
  if (!base || !key) throw new Error('BLNK_URL and BLNK_SECRET_KEY must be set')

  const res = await fetch(new URL(path, base), {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Blnk-Key': key },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await res.text()
  if (!res.ok) throw new BlnkError(`Blnk ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${text}`, res.status, text)
  return JSON.parse(text) as T
}

let ledgerId: Promise<string> | null = null

function getLedgerId() {
  ledgerId ??= (async () => {
    const saved = await getSetting('blnk_ledger_id')
    if (saved) return saved
    const ledger = await blnk<{ ledger_id: string }>('/ledgers', {
      method: 'POST',
      body: { name: LEDGER_NAME, meta_data: { app: 'giftme' } },
    })
    await setSetting('blnk_ledger_id', ledger.ledger_id)
    return ledger.ledger_id
  })().catch((err) => {
    ledgerId = null
    throw err
  })
  return ledgerId
}

export async function createOwnerIdentity(owner: { id: string; displayName: string; email: string | null; handle: string | null }) {
  const [first, ...rest] = owner.displayName.trim().split(/\s+/)
  const identity = await blnk<{ identity_id: string }>('/identities', {
    method: 'POST',
    body: {
      identity_type: 'individual',
      first_name: first || owner.displayName,
      last_name: rest.join(' '),
      email_address: owner.email ?? '',
      category: 'wishlist_owner',
      meta_data: { owner_id: owner.id, handle: owner.handle ?? '' },
    },
  })
  return identity.identity_id
}

export async function createItemBalance(opts: {
  identityId: string | null
  ownerId: string
  wishlistId: string
  itemId: string
  title: string
  kind: string
}) {
  const balance = await blnk<{ balance_id: string }>('/balances', {
    method: 'POST',
    body: {
      ledger_id: await getLedgerId(),
      identity_id: opts.identityId ?? undefined,
      currency: CURRENCY,
      meta_data: {
        owner_id: opts.ownerId,
        wishlist_id: opts.wishlistId,
        item_id: opts.itemId,
        item_title: opts.title,
        kind: opts.kind,
      },
    },
  })
  return balance.balance_id
}

export type BalanceSummary = { raisedKobo: number; paidOutKobo: number; heldKobo: number; pendingKobo: number }

/** Confirmed money only; pending (inflight) payments don't count toward progress. */
export async function getBalanceSummary(balanceId: string): Promise<BalanceSummary> {
  const b = await blnk<BlnkBalance>(`/balances/${balanceId}`)
  return {
    raisedKobo: Number(b.credit_balance ?? 0),
    paidOutKobo: Number(b.debit_balance ?? 0),
    heldKobo: Number(b.balance ?? 0),
    pendingKobo: Number(b.inflight_credit_balance ?? 0),
  }
}

/** A guest has started paying: hold the amount as pending until Paystack confirms. */
export async function recordPendingGift(opts: {
  reference: string
  balanceId: string
  amountKobo: number
  meta: Record<string, string>
}) {
  const txn = await blnk<BlnkTransaction>('/transactions', {
    method: 'POST',
    body: {
      precise_amount: opts.amountKobo,
      precision: PRECISION,
      currency: CURRENCY,
      reference: opts.reference,
      source: INTERNAL.paystack,
      destination: opts.balanceId,
      description: 'Wishlist contribution',
      allow_overdraft: true,
      inflight: true,
      skip_queue: true,
      meta_data: { ...opts.meta, paystack_reference: opts.reference },
    },
  })
  return txn.transaction_id
}

export async function settlePendingGift(transactionId: string, outcome: 'commit' | 'void') {
  await blnk(`/transactions/inflight/${transactionId}`, {
    method: 'PUT',
    body: { status: outcome, skip_queue: true },
  })
}

function isDuplicateReference(err: unknown) {
  return err instanceof BlnkError && /reference/i.test(err.body) && /(already|exist|duplicate|used)/i.test(err.body)
}

/** Moves money out of an item balance. Safe to repeat: the reference makes it happen once. */
async function moveFromItem(opts: {
  reference: string
  balanceId: string
  destination: string
  amountKobo: number
  description: string
  meta: Record<string, string>
}) {
  if (opts.amountKobo <= 0) return
  try {
    await blnk<BlnkTransaction>('/transactions', {
      method: 'POST',
      body: {
        precise_amount: opts.amountKobo,
        precision: PRECISION,
        currency: CURRENCY,
        reference: opts.reference,
        source: opts.balanceId,
        destination: opts.destination,
        description: opts.description,
        skip_queue: true,
        meta_data: opts.meta,
      },
    })
  } catch (err) {
    if (!isDuplicateReference(err)) throw err
  }
}

/**
 * After a payment commits: Paystack has already split it, the fee to GiftMe's main account
 * and the rest to the owner's subaccount (settled to their bank). Mirror that in the ledger.
 */
export async function recordSplit(opts: {
  reference: string
  balanceId: string
  amountKobo: number
  feeKobo: number
  meta: Record<string, string>
}) {
  await moveFromItem({
    reference: `${opts.reference}_fee`,
    balanceId: opts.balanceId,
    destination: INTERNAL.fees,
    amountKobo: opts.feeKobo,
    description: 'GiftMe platform fee',
    meta: opts.meta,
  })
  await moveFromItem({
    reference: `${opts.reference}_payout`,
    balanceId: opts.balanceId,
    destination: INTERNAL.payouts,
    amountKobo: opts.amountKobo - opts.feeKobo,
    description: "Settled to owner's bank via Paystack subaccount",
    meta: opts.meta,
  })
}

/** Money given outside GiftMe (cash, direct transfer), recorded straight away. */
export async function recordOfflineGift(opts: {
  reference: string
  balanceId: string
  amountKobo: number
  note?: string
  meta: Record<string, string>
}) {
  const txn = await blnk<BlnkTransaction>('/transactions', {
    method: 'POST',
    body: {
      precise_amount: opts.amountKobo,
      precision: PRECISION,
      currency: CURRENCY,
      reference: opts.reference,
      source: INTERNAL.offline,
      destination: opts.balanceId,
      description: opts.note || 'Offline gift',
      allow_overdraft: true,
      skip_queue: true,
      meta_data: opts.meta,
    },
  })
  return txn.transaction_id
}
