import { useEffect, useState } from 'react'
import { ErrorText, Field } from '@/components/ui'
import { inputClass, primaryButton, secondaryButton } from '@/lib/ui'
import { lookupAccountFn, savePayoutAccountFn } from '@/server/fns/owner'

/** Pick a bank, type the account number, confirm the name Paystack finds, save. */
export function PayoutForm({
  banks,
  current,
  onSaved,
}: {
  banks: { name: string; code: string }[]
  current: { bankName: string; last4: string; accountName: string } | null
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(!current)
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Look the name up as soon as there are 10 digits and a bank, so people can confirm it's theirs.
  useEffect(() => {
    setAccountName(null)
    setError(null)
    if (accountNumber.length !== 10 || !bankCode) return
    let cancelled = false
    setLooking(true)
    lookupAccountFn({ data: { accountNumber, bankCode } })
      .then((res) => {
        if (cancelled) return
        if (res.ok) setAccountName(res.accountName)
        else setError(res.error)
      })
      .catch(() => !cancelled && setError("We couldn't check that account."))
      .finally(() => !cancelled && setLooking(false))
    return () => {
      cancelled = true
    }
  }, [accountNumber, bankCode])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const res = await savePayoutAccountFn({ data: { accountNumber, bankCode } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setEditing(false)
    onSaved()
  }

  if (!editing && current) {
    return (
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-300/50 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-500/30">
        <div>
          <p className="text-[15px]">{current.accountName}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {current.bankName} · ending {current.last4}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className={`min-h-10 px-4 text-sm ${secondaryButton}`}>
          Change
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="mt-5 flex flex-col gap-4">
      <Field label="Bank">
        <select className={inputClass} value={bankCode} onChange={(e) => setBankCode(e.target.value)} required>
          <option value="">Choose your bank</option>
          {banks.map((b) => (
            <option key={`${b.code}-${b.name}`} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Account number">
        <input
          className={inputClass}
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10 digits"
          required
        />
      </Field>
      {looking && <p className="text-sm text-neutral-500">Checking the account…</p>}
      {accountName && (
        <p className="text-sm">
          Account name: <span className="text-emerald-700 dark:text-emerald-400">{accountName}</span>
        </p>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2.5">
        <button type="submit" disabled={busy || !accountName} className={`min-h-12 flex-1 text-[15px] ${primaryButton}`}>
          {busy ? 'Saving…' : 'Save bank account'}
        </button>
        {current && (
          <button type="button" onClick={() => setEditing(false)} className={`min-h-12 px-5 text-[15px] ${secondaryButton}`}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
