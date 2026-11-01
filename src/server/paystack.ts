import { createHmac, timingSafeEqual } from 'node:crypto'

const API = 'https://api.paystack.co'

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY must be set')
  return key
}

export class PaystackError extends Error {}

async function paystack<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const method = init?.method ?? (init?.body === undefined ? 'GET' : 'POST')
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = (await res.json().catch(() => ({ status: false, message: `HTTP ${res.status}` }))) as {
    status: boolean
    message: string
    data: T
  }
  if (!res.ok || !json.status) throw new PaystackError(`Paystack ${method} ${path} failed: ${json.message}`)
  return json.data
}

export type Bank = { name: string; code: string }

let banks: Promise<Bank[]> | null = null

export function listBanks() {
  banks ??= paystack<{ name: string; code: string; active: boolean; is_deleted: boolean }[]>(
    '/bank?country=nigeria&currency=NGN&perPage=100',
  )
    .then((list) => list.filter((b) => b.active && !b.is_deleted).map((b) => ({ name: b.name, code: b.code })))
    .catch((err) => {
      banks = null
      throw err
    })
  return banks
}

export async function resolveAccount(accountNumber: string, bankCode: string) {
  return paystack<{ account_number: string; account_name: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
  )
}

/** A subaccount lets Paystack settle each guest payment straight to the owner's bank. */
export async function upsertSubaccount(opts: {
  existingCode: string | null
  businessName: string
  bankCode: string
  accountNumber: string
  percentageCharge: number
  email: string | null
  ownerId: string
}) {
  const body = {
    business_name: opts.businessName,
    settlement_bank: opts.bankCode,
    account_number: opts.accountNumber,
    percentage_charge: opts.percentageCharge,
    primary_contact_email: opts.email ?? undefined,
    description: 'GiftMe wishlist owner',
    metadata: JSON.stringify({ owner_id: opts.ownerId }),
  }
  const data = opts.existingCode
    ? await paystack<{ subaccount_code: string }>(`/subaccount/${encodeURIComponent(opts.existingCode)}`, { method: 'PUT', body })
    : await paystack<{ subaccount_code: string }>('/subaccount', { body })
  return data.subaccount_code ?? opts.existingCode
}

export async function initializePayment(opts: {
  reference: string
  email: string
  amountKobo: number
  callbackUrl: string
  subaccount: string
  /** Flat amount (kobo) kept by GiftMe's main account; the rest goes to the subaccount. */
  feeKobo: number
  metadata: Record<string, unknown>
}) {
  return paystack<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    body: {
      reference: opts.reference,
      email: opts.email,
      amount: opts.amountKobo,
      currency: 'NGN',
      callback_url: opts.callbackUrl,
      channels: ['card', 'bank_transfer', 'ussd', 'bank'],
      subaccount: opts.subaccount,
      transaction_charge: opts.feeKobo,
      // The owner's share carries Paystack's processing fee, so GiftMe never pays out of pocket.
      bearer: 'subaccount',
      metadata: opts.metadata,
    },
  })
}

export type PaystackStatus = 'success' | 'failed' | 'abandoned' | 'reversed' | 'ongoing' | 'pending' | 'processing' | 'queued'

export async function verifyPayment(reference: string) {
  return paystack<{ status: PaystackStatus; amount: number; currency: string; reference: string }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  )
}

/** Paystack signs each webhook body with HMAC-SHA512 using the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false
  const expected = createHmac('sha512', secretKey()).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
