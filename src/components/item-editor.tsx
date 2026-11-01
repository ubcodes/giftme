import { useEffect, useRef, useState } from 'react'
import { addItemFn, previewLinkFn, resolveShopLinkFn, searchProductsFn, updateItemFn } from '@/server/fns/owner'
import type { ProductResult } from '@/server/search'
import { naira } from '@/lib/format'
import { inputClass, primaryButton, secondaryButton } from '@/lib/ui'
import { Dialog, ErrorText, Field, GiftIcon } from './ui'
import { UploadButton } from './upload'

export type ItemValues = {
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

const EMPTY_GIFT: ItemValues = {
  kind: 'gift',
  title: '',
  priceNgn: null,
  priceUsd: null,
  imageUrl: null,
  link: null,
  note: null,
  allowReserve: true,
  allowMoney: true,
}

type Tab = 'find' | 'manual'

type GiveMode = 'money' | 'buy' | 'both'

const GIVE_MODES: { id: GiveMode; label: string; hint: string }[] = [
  { id: 'both', label: 'Both', hint: 'Chip in money, or buy it' },
  { id: 'money', label: 'Chip in money', hint: 'Friends send any amount' },
  { id: 'buy', label: 'Buy it themselves', hint: 'One guest reserves and buys' },
]

function looksLikeLink(text: string) {
  const t = text.trim()
  return /^https?:\/\//i.test(t) || (/^[^\s]+\.[a-z]{2,}\/\S*/i.test(t) && !t.includes(' '))
}

/** "Add a gift": paste a link or type what you want, then confirm the details. */
export function AddGiftDialog({
  wishlistId,
  searchEnabled,
  usdRate,
  onClose,
  onSaved,
}: {
  wishlistId: string
  searchEnabled: boolean
  usdRate: number
  onClose: () => void
  onSaved: () => void
}) {
  const [tab, setTab] = useState<Tab>('find')
  const [draft, setDraft] = useState<ItemValues | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function save(values: ItemValues) {
    const res = await addItemFn({ data: { wishlistId, ...values } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
    if (!res.ok) return res.error
    onSaved()
    return null
  }

  return (
    <Dialog title={draft ? 'Check the details' : 'Add a gift'} subtitle={draft ? notice ?? 'Change anything you like, then save.' : undefined} onClose={onClose} wide>
      {draft ? (
        <ItemForm
          initial={draft}
          usdRate={usdRate}
          submitLabel="Add to wishlist"
          onBack={() => {
            setDraft(null)
            setNotice(null)
          }}
          onSubmit={save}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex gap-1 rounded-full border border-neutral-300/70 p-1 dark:border-neutral-700/70" role="tablist">
            {(
              [
                { id: 'find', label: searchEnabled ? 'Paste a link or search' : 'Paste a link' },
                { id: 'manual', label: 'Type it in' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-9 flex-1 cursor-pointer rounded-full px-3 text-sm transition-colors ${
                  tab === t.id ? 'bg-purple-500/20 text-purple-800 dark:text-purple-200' : 'text-neutral-600 hover:bg-neutral-900/5 dark:text-neutral-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'find' && (
            <FindTab
              searchEnabled={searchEnabled}
              onPick={(d, msg) => {
                setDraft(d)
                setNotice(msg)
              }}
            />
          )}
          {tab === 'manual' && <ItemForm initial={EMPTY_GIFT} usdRate={usdRate} submitLabel="Add to wishlist" onSubmit={save} />}
        </div>
      )}
    </Dialog>
  )
}

/** One box: paste a shop link to fill in the details, or type to see matching products. */
function FindTab({ searchEnabled, onPick }: { searchEnabled: boolean; onPick: (draft: ItemValues, notice: string | null) => void }) {
  const [text, setText] = useState('')
  const [reading, setReading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ProductResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isLink = looksLikeLink(text)
  const latest = useRef('')

  async function readLink(url: string) {
    setReading(true)
    setError(null)
    const res = await previewLinkFn({ data: { url } }).catch(() => ({ ok: false as const, error: "We couldn't open that link." }))
    setReading(false)
    if (!res.ok) return setError(res.error)
    const d = res.draft
    const missing = [!d.title && 'name', !d.priceNgn && 'price', !d.imageUrl && 'photo'].filter(Boolean)
    const from = d.siteName ?? 'the shop'
    onPick(
      { ...EMPTY_GIFT, title: d.title ?? '', priceNgn: d.priceNgn, priceUsd: d.priceUsd, imageUrl: d.imageUrl, link: d.link },
      d.approximate
        ? `${from} doesn't let apps read its pages, so we found the closest match. Please check the name and price.`
        : missing.length
          ? `We filled in what ${from} shares. Please add the ${missing.join(' and ')}${d.originalPrice ? ` (listed at ${d.originalPrice})` : ''}.`
          : `Filled in from ${from}. Change anything you like, then save.`,
    )
  }

  // Search as you type, once the typing pauses.
  useEffect(() => {
    const q = text.trim()
    setError(null)
    if (!searchEnabled || isLink || q.length < 3) {
      setResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      latest.current = q
      const res = await searchProductsFn({ data: { query: q } }).catch(() => ({ ok: false as const, error: 'Search failed. Try again.' }))
      if (latest.current !== q) return
      setSearching(false)
      if (!res.ok) return setError(res.error)
      setResults(res.results)
    }, 700)
    return () => clearTimeout(t)
  }, [text, isLink, searchEnabled])

  const local = results?.filter((r) => r.region === 'ng') ?? []
  const abroad = results?.filter((r) => r.region === 'intl') ?? []

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (isLink) void readLink(text.trim())
      }}
      className="flex flex-col gap-4"
    >
      <div className="relative">
        <svg className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {isLink ? <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /> : <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>}
        </svg>
        <input
          className={`${inputClass} !pl-10`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (looksLikeLink(pasted)) {
              e.preventDefault()
              setText(pasted.trim())
              void readLink(pasted.trim())
            }
          }}
          placeholder={searchEnabled ? 'Paste a link, or type what you’d love: “drum set”' : 'https://www.jumia.com.ng/…'}
          inputMode={searchEnabled ? 'search' : 'url'}
        />
      </div>

      {isLink && (
        <button type="submit" disabled={reading} className={`min-h-11 text-[15px] ${primaryButton}`}>
          {reading ? 'Reading the page…' : 'Fill in details'}
        </button>
      )}
      {!text && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Paste a link from any shop (Jumia, Amazon, Temu, a small store's website…) and we'll fill in the name, photo and
          price.{searchEnabled && ' Or just type what you want and pick from shops that sell it.'}
        </p>
      )}
      <ErrorText>{error}</ErrorText>
      {error && isLink && (
        <button
          type="button"
          onClick={() => onPick({ ...EMPTY_GIFT, link: /^https?:\/\//.test(text) ? text.trim() : null }, 'Add the details by hand.')}
          className="self-start text-sm underline underline-offset-4"
        >
          Add it by hand instead
        </button>
      )}

      {searching && !results && <ResultSkeleton />}
      {results && results.length === 0 && !searching && <p className="text-sm text-neutral-500">Nothing found. Try other words, or paste a link.</p>}
      {results && results.length > 0 && (
        <div className={`flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1 transition-opacity ${searching ? 'opacity-60' : ''}`}>
          {local.length > 0 && <ResultGroup title="Sold in Nigeria" results={local} onPick={onPick} />}
          {abroad.length > 0 && <ResultGroup title="International shops" note="Prices converted to naira" results={abroad} onPick={onPick} />}
        </div>
      )}
    </form>
  )
}

function ResultGroup({
  title,
  note,
  results,
  onPick,
}: {
  title: string
  note?: string
  results: ProductResult[]
  onPick: (draft: ItemValues, notice: string | null) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">
        {title}
        {note && <span className="tracking-normal normal-case"> · {note}</span>}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={!!busy}
            onClick={async () => {
              let link = r.link
              if (!link && r.resolveToken) {
                setBusy(r.id)
                const res = await resolveShopLinkFn({ data: { token: r.resolveToken, source: r.source } }).catch(() => null)
                setBusy(null)
                link = res?.ok ? res.link : null
              }
              onPick(
                { ...EMPTY_GIFT, title: r.title, priceNgn: r.priceNgn, priceUsd: r.priceUsd, imageUrl: r.imageUrl, link },
                r.source ? `From ${r.source}. Change anything you like, then save.` : null,
              )
            }}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white/60 text-left transition-all hover:-translate-y-0.5 hover:border-purple-400/70 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/50"
          >
            <div className="relative aspect-square w-full bg-white p-2">
              {r.imageUrl ? <img src={r.imageUrl} alt="" className="size-full object-contain" loading="lazy" /> : null}
              {busy === r.id && <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs text-neutral-600">Finding the shop…</span>}
            </div>
            <div className="flex flex-col gap-0.5 p-2.5">
              <span className="line-clamp-2 text-sm leading-snug">{r.title}</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.priceNgn ? naira(r.priceNgn) : r.priceText}</span>
              {r.source && <span className="truncate text-xs text-neutral-500">{r.source}</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function ResultSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Searching">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex animate-pulse flex-col overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800">
          <div className="aspect-square bg-neutral-200/70 dark:bg-neutral-800" />
          <div className="flex flex-col gap-1.5 p-2.5">
            <div className="h-3 w-4/5 rounded bg-neutral-200/80 dark:bg-neutral-800" />
            <div className="h-3 w-1/3 rounded bg-neutral-200/80 dark:bg-neutral-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EditItemDialog({
  item,
  usdRate,
  onClose,
  onSaved,
}: {
  item: ItemValues & { id: string }
  usdRate: number
  onClose: () => void
  onSaved: () => void
}) {
  return (
    <Dialog title={item.kind === 'fund' ? 'Edit cash fund' : 'Edit gift'} onClose={onClose} wide>
      <ItemForm
        initial={item}
        usdRate={usdRate}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          const res = await updateItemFn({ data: { id: item.id, ...values } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
          if (!res.ok) return res.error
          onSaved()
          return null
        }}
      />
    </Dialog>
  )
}

export function AddFundDialog({ wishlistId, onClose, onSaved }: { wishlistId: string; onClose: () => void; onSaved: () => void }) {
  return (
    <Dialog title="Add a cash fund" subtitle="For things with no single product: a honeymoon, school fees, a new laptop." onClose={onClose} wide>
      <ItemForm
        initial={{ ...EMPTY_GIFT, kind: 'fund', allowReserve: false }}
        usdRate={0}
        submitLabel="Add fund"
        onSubmit={async (values) => {
          const res = await addItemFn({ data: { wishlistId, ...values } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
          if (!res.ok) return res.error
          onSaved()
          return null
        }}
      />
    </Dialog>
  )
}

function ItemForm({
  initial,
  usdRate,
  submitLabel,
  onSubmit,
  onBack,
}: {
  initial: ItemValues
  usdRate: number
  submitLabel: string
  onSubmit: (values: ItemValues) => Promise<string | null>
  onBack?: () => void
}) {
  const fund = initial.kind === 'fund'
  const [title, setTitle] = useState(initial.title)
  const [price, setPrice] = useState(initial.priceNgn ? String(initial.priceNgn) : '')
  const [usd, setUsd] = useState(initial.priceUsd ? String(initial.priceUsd) : '')
  const [image, setImage] = useState(initial.imageUrl)
  const [link, setLink] = useState(initial.link ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [mode, setMode] = useState<GiveMode>(initial.allowMoney && initial.allowReserve ? 'both' : initial.allowReserve ? 'buy' : 'money')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onUsd(v: string) {
    const clean = v.replace(/[^\d.]/g, '')
    setUsd(clean)
    if (clean && usdRate) setPrice(String(Math.round(Number(clean) * usdRate)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    let cleanLink: string | null = link.trim() || null
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) cleanLink = `https://${cleanLink}`
    const err = await onSubmit({
      kind: initial.kind,
      title: title.trim(),
      priceNgn: price ? Number(price) : null,
      priceUsd: usd ? Number(usd) : null,
      imageUrl: image,
      link: cleanLink,
      note: note.trim() || null,
      allowReserve: !fund && mode !== 'money',
      allowMoney: fund || mode !== 'buy',
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={submit} className="grid gap-6 sm:grid-cols-[200px_1fr]">
      <div className="flex flex-col gap-2.5">
        <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-400 dark:from-neutral-800/60 dark:to-neutral-900 dark:text-neutral-600">
          {image ? <img src={image} alt="" className="size-full object-cover" /> : <GiftIcon size={32} />}
        </div>
        <UploadButton folder="items" onUploaded={setImage} label={image ? 'Change photo' : 'Add a photo'} className="w-full" />
        {image && (
          <button type="button" onClick={() => setImage(null)} className="cursor-pointer text-xs text-neutral-500 underline underline-offset-4">
            Remove photo
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <Field label={fund ? 'Fund name' : 'Gift'}>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={fund ? 'Honeymoon fund' : 'Ceramic pour-over set'}
            required
            maxLength={200}
          />
        </Field>
        <div className={`grid gap-4 ${fund || !usdRate ? '' : 'sm:grid-cols-2'}`}>
          <Field label={fund ? 'Goal (₦)' : 'Price (₦)'} hint={fund ? 'optional' : undefined}>
            <input
              className={inputClass}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder={fund ? 'Leave empty for no goal' : '45000'}
              required={!fund}
            />
          </Field>
          {!fund && usdRate > 0 && (
            <Field label="Price in dollars" hint={`optional, ₦${usdRate.toLocaleString()}/$`}>
              <input className={inputClass} inputMode="decimal" value={usd} onChange={(e) => onUsd(e.target.value)} placeholder="30" />
            </Field>
          )}
        </div>
        {!fund && (
          <Field label="Link to the shop" hint="optional">
            <input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" />
          </Field>
        )}
        <Field label="A note for guests" hint="optional: size, colour, why you want it">
          <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
        {!fund && (
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2">How can guests give this?</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {GIVE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    mode === m.id
                      ? 'border-purple-400/70 bg-purple-500/15 dark:border-purple-500/60'
                      : 'border-neutral-300/70 hover:bg-neutral-900/5 dark:border-neutral-700/70 dark:hover:bg-neutral-100/5'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{m.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2.5">
          {onBack && (
            <button type="button" onClick={onBack} className={`min-h-12 px-5 text-[15px] ${secondaryButton}`}>
              Back
            </button>
          )}
          <button type="submit" disabled={busy} className={`min-h-12 flex-1 text-[15px] ${primaryButton}`}>
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault()
        onChange(!checked)
      }}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-purple-500/80' : 'bg-neutral-300 dark:bg-neutral-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}
