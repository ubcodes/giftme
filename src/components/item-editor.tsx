import { useState } from 'react'
import { addItemFn, previewLinkFn, searchProductsFn, updateItemFn } from '@/server/fns/owner'
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
}

type Tab = 'link' | 'search' | 'manual'

/** "Add a gift": paste a link, search, or type it in, then confirm the details. */
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
  const [tab, setTab] = useState<Tab>('link')
  const [draft, setDraft] = useState<ItemValues | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'link', label: 'Paste a link' },
    ...(searchEnabled ? [{ id: 'search' as const, label: 'Search' }] : []),
    { id: 'manual', label: 'Type it in' },
  ]

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
          onSubmit={async (values) => {
            const res = await addItemFn({ data: { wishlistId, ...values } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
            if (!res.ok) return res.error
            onSaved()
            return null
          }}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex gap-1 rounded-full border border-neutral-300/70 p-1 dark:border-neutral-700/70" role="tablist">
            {tabs.map((t) => (
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
          {tab === 'link' && (
            <LinkTab
              onFound={(d, msg) => {
                setDraft(d)
                setNotice(msg)
              }}
            />
          )}
          {tab === 'search' && <SearchTab onPick={(d) => setDraft(d)} />}
          {tab === 'manual' && (
            <ItemForm
              initial={EMPTY_GIFT}
              usdRate={usdRate}
              submitLabel="Add to wishlist"
              onSubmit={async (values) => {
                const res = await addItemFn({ data: { wishlistId, ...values } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
                if (!res.ok) return res.error
                onSaved()
                return null
              }}
            />
          )}
        </div>
      )}
    </Dialog>
  )
}

function LinkTab({ onFound }: { onFound: (draft: ItemValues, notice: string | null) => void }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await previewLinkFn({ data: { url } }).catch(() => ({ ok: false as const, error: "We couldn't open that link." }))
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    const d = res.draft
    const missing = [!d.title && 'name', !d.priceNgn && 'price', !d.imageUrl && 'photo'].filter(Boolean)
    onFound(
      { ...EMPTY_GIFT, title: d.title ?? '', priceNgn: d.priceNgn, priceUsd: d.priceUsd, imageUrl: d.imageUrl, link: d.link },
      missing.length
        ? `We filled in what ${d.siteName ?? 'the shop'} shares. Please add the ${missing.join(' and ')}${d.originalPrice ? ` (listed at ${d.originalPrice})` : ''}.`
        : `Filled in from ${d.siteName ?? 'the shop'}. Change anything you like, then save.`,
    )
  }

  return (
    <form onSubmit={fetchLink} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Copy the link from any shop (Jumia, Konga, Amazon, a small Instagram store with a website…) and paste it here.
        We'll fill in the name, photo and price.
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          className={inputClass}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.jumia.com.ng/…"
          inputMode="url"
          autoFocus
          required
        />
        <button type="submit" disabled={busy || url.trim().length < 4} className={`min-h-11 shrink-0 px-5 text-[15px] ${primaryButton}`}>
          {busy ? 'Reading the page…' : 'Fill in details'}
        </button>
      </div>
      <ErrorText>{error}</ErrorText>
      {error && (
        <button
          type="button"
          onClick={() => onFound({ ...EMPTY_GIFT, link: /^https?:\/\//.test(url) ? url : null }, 'Add the details by hand.')}
          className="self-start text-sm underline underline-offset-4"
        >
          Add it by hand instead
        </button>
      )}
    </form>
  )
}

function SearchTab({ onPick }: { onPick: (draft: ItemValues) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await searchProductsFn({ data: { query } }).catch(() => ({ ok: false as const, error: 'Search failed. Try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setResults(res.results)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex flex-col gap-2.5 sm:flex-row">
        <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “drum set” or “air fryer”" autoFocus />
        <button type="submit" disabled={busy || query.trim().length < 2} className={`min-h-11 shrink-0 px-5 text-[15px] ${primaryButton}`}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>
      <ErrorText>{error}</ErrorText>
      {results && results.length === 0 && <p className="text-sm text-neutral-500">Nothing found. Try other words.</p>}
      {results && results.length > 0 && (
        <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() =>
                onPick({ ...EMPTY_GIFT, title: r.title, priceNgn: r.priceNgn, priceUsd: r.priceUsd, imageUrl: r.imageUrl, link: r.link })
              }
              className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white/60 text-left transition-colors hover:border-purple-400/70 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <div className="aspect-square w-full bg-white p-2">
                {r.imageUrl ? <img src={r.imageUrl} alt="" className="size-full object-contain" loading="lazy" /> : null}
              </div>
              <div className="flex flex-col gap-0.5 p-2.5">
                <span className="line-clamp-2 text-sm leading-snug">{r.title}</span>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.priceNgn ? naira(r.priceNgn) : r.priceText}</span>
                {r.source && <span className="truncate text-xs text-neutral-500">{r.source}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
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
  const [allowReserve, setAllowReserve] = useState(initial.allowReserve)
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
      allowReserve: !fund && allowReserve,
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
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-neutral-300/70 px-4 py-3 text-sm dark:border-neutral-700/70">
            <span>
              Guests can reserve it to buy
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">They buy it themselves; others see it as taken.</span>
            </span>
            <Switch checked={allowReserve} onChange={setAllowReserve} />
          </label>
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
