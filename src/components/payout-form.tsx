import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
        <BankPicker banks={banks} value={bankCode} onChange={setBankCode} />
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

// The banks most people use, shown first before anything is typed. Matched against Paystack's names.
const POPULAR = ['opay', 'moniepoint', 'palmpay', 'kuda', 'access bank', 'guaranty trust', 'zenith', 'first bank', 'united bank for africa', 'wema', 'fidelity', 'stanbic', 'sterling', 'union bank', 'ecobank', 'first city monument']
// Short names people actually type.
const ALIASES: Record<string, string> = { gtb: 'guaranty trust', gtbank: 'guaranty trust', uba: 'united bank for africa', fcmb: 'first city monument', firstbank: 'first bank', stanbic: 'stanbic ibtc' }

/**
 * A searchable bank list. Paystack returns hundreds of banks, which as a plain dropdown
 * fills a phone screen; here you type a few letters ("gt", "opay") and pick from a short list.
 */
function BankPicker({ banks, value, onChange }: { banks: { name: string; code: string }[]; value: string; onChange: (code: string) => void }) {
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const chosen = banks.find((b) => b.code === value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const top = POPULAR.map((p) => banks.find((b) => b.name.toLowerCase().includes(p))).filter((b): b is (typeof banks)[number] => !!b)
      return [...new Map(top.map((b) => [b.code, b])).values()]
    }
    const terms = [q, ALIASES[q.replace(/\s+/g, '')]].filter(Boolean) as string[]
    const hits = banks.filter((b) => terms.some((t) => b.name.toLowerCase().includes(t)))
    // Names that start with what was typed come first.
    return hits.sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q))).slice(0, 40)
  }, [banks, query])

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function pick(code: string) {
    onChange(code)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={box} className="relative">
      <input
        className={inputClass}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={chosen ? chosen.name : 'Search your bank, e.g. OPay or GTBank'}
        value={open ? query : (chosen?.name ?? '')}
        onFocus={() => {
          setOpen(true)
          setActive(0)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && open && results[active]) {
            e.preventDefault()
            pick(results[active].code)
          } else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {/* Keeps the form's "required" check working without the native select. */}
      <input tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" value={value} onChange={() => {}} required />
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="mt-1.5 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-neutral-200/80 bg-white p-1 shadow-xl shadow-purple-950/10 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {!query && <li className="px-3 pt-1.5 pb-1 text-xs text-neutral-500">Popular banks · type to search all {banks.length}</li>}
          {results.map((b, i) => (
            <li
              key={`${b.code}-${b.name}`}
              role="option"
              aria-selected={b.code === value}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(b.code)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-[15px] ${i === active ? 'bg-purple-500/10' : ''} ${b.code === value ? 'text-purple-700 dark:text-purple-300' : ''}`}
            >
              {b.name}
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-2.5 text-sm text-neutral-500">No bank matches “{query}”</li>}
        </ul>
      )}
    </div>
  )
}
