import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { ThemeToggle } from '@/components/theme'
import { Avatar, Bar, Dialog, ErrorText, Field, GiftIcon, Glow, Logo, glassCard } from '@/components/ui'
import { contributeFn, getPublicWishlistFn, reserveFn } from '@/server/fns/guest'
import type { PublicItem } from '@/server/gifts'
import { countdownText, formatDate } from '@/lib/dates'
import { naira } from '@/lib/format'
import { occasion } from '@/lib/occasions'
import { inputClass, primaryButton, secondaryButton } from '@/lib/ui'

export const Route = createFileRoute('/w/$handle/$slug')({
  loader: async ({ params }) => {
    const data = await getPublicWishlistFn({ data: { handle: params.handle, slug: params.slug } })
    if (!data.found) throw notFound()
    return data
  },
  head: ({ loaderData }) => {
    if (!loaderData?.found) return { meta: [{ title: 'Wishlist not found · GiftMe' }] }
    const description = loaderData.wishlist.intro ?? `Contribute toward a gift for ${loaderData.owner.displayName}, or reserve one to buy yourself.`
    return {
      meta: [
        { title: `${loaderData.wishlist.title} · GiftMe` },
        { name: 'description', content: description },
        { property: 'og:title', content: loaderData.wishlist.title },
        { property: 'og:description', content: description },
        ...(loaderData.wishlist.coverUrl ?? loaderData.owner.avatarUrl
          ? [{ property: 'og:image', content: (loaderData.wishlist.coverUrl ?? loaderData.owner.avatarUrl)! }]
          : []),
      ],
    }
  },
  notFoundComponent: NotFound,
  component: PublicWishlist,
})

function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-editorial text-6xl">Hmm</h1>
      <p className="text-neutral-600 dark:text-neutral-400">We couldn't find that wishlist. Check the link with whoever sent it.</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Go to GiftMe
      </Link>
    </main>
  )
}

function PublicWishlist() {
  const data = Route.useLoaderData()
  const [dialog, setDialog] = useState<{ kind: 'contribute' | 'reserve'; item: PublicItem } | null>(null)
  if (!data.found) return null
  const { owner, wishlist, items, minContribution, acceptsMoney } = data
  const gifts = items.filter((i) => i.kind === 'gift')
  const complete = gifts.filter((i) => i.state !== 'open').length
  const countdown = wishlist.eventDate ? countdownText(wishlist.eventDate) : null
  const firstName = owner.displayName.split(' ')[0]

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <nav className="flex items-center justify-between pt-6">
          <Link to="/w/$handle" params={{ handle: owner.handle }} className="flex items-center gap-3">
            <Avatar src={owner.avatarUrl} name={owner.displayName} size={44} />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">{owner.displayName}</span>
          </Link>
          <ThemeToggle />
        </nav>

        <header className="flex flex-col gap-5 pt-14 pb-12 sm:pt-20">
          {wishlist.coverUrl && <img src={wishlist.coverUrl} alt="" className="mb-4 aspect-[16/5] max-h-72 w-full rounded-3xl object-cover shadow-sm" />}
          <div className="flex max-w-2xl flex-col gap-5">
            <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">
              {occasion(wishlist.occasion).label}
              {wishlist.eventDate && ` · ${formatDate(wishlist.eventDate)}`}
            </p>
            <h1 className="font-display text-5xl leading-none font-normal sm:text-7xl">{titleWithAccent(wishlist.title)}</h1>
            {countdown && <p className="font-editorial text-3xl text-purple-600/90 dark:text-purple-300/90">{countdown}</p>}
            <p className="max-w-lg text-[15px] leading-relaxed whitespace-pre-line text-neutral-600 dark:text-neutral-400">
              {wishlist.intro ??
                `Contribute toward any gift, or reserve one to buy yourself. Names and amounts stay private; only the progress shows.`}
            </p>
            {gifts.length > 0 && (
              <div className="flex max-w-md items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                <Bar percent={(complete / gifts.length) * 100} />
                <span className="shrink-0">
                  {complete} of {gifts.length} complete
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 gap-3 pb-16 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.length === 0 && (
            <p className="col-span-full py-16 text-center text-neutral-500">{firstName} is still putting the list together. Check back soon.</p>
          )}
          {items.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              index={i}
              acceptsMoney={acceptsMoney}
              onContribute={() => setDialog({ kind: 'contribute', item })}
              onReserve={() => setDialog({ kind: 'reserve', item })}
            />
          ))}
        </main>

        <footer className="flex flex-col gap-3 border-t border-neutral-200 py-8 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-400">
          <span>Secure payments in naira · open source</span>
          <span className="flex items-center gap-2">
            Made with <Logo />
          </span>
        </footer>
      </div>

      {dialog?.kind === 'contribute' && (
        <ContributeDialog item={dialog.item} ownerFirstName={firstName} min={minContribution} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'reserve' && <ReserveDialog item={dialog.item} ownerFirstName={firstName} onClose={() => setDialog(null)} />}
    </div>
  )
}

/** Sets the last word in the handwritten face, like the original wishlist. */
function titleWithAccent(title: string) {
  const words = title.trim().split(/\s+/)
  if (words.length < 2) return title
  const last = words.pop()
  return (
    <>
      {words.join(' ')} <span className="font-editorial text-6xl sm:text-8xl">{last}</span>
    </>
  )
}

function ItemCard({
  item,
  index,
  acceptsMoney,
  onContribute,
  onReserve,
}: {
  item: PublicItem
  index: number
  acceptsMoney: boolean
  onContribute: () => void
  onReserve: () => void
}) {
  return (
    <article className={`relative flex flex-col overflow-hidden rounded-2xl ${glassCard}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/[0.06] via-pink-500/[0.03] to-transparent dark:from-purple-500/10 dark:via-pink-500/5"
      />
      <div className="relative flex flex-1 gap-4 p-3.5 sm:flex-col sm:gap-3 sm:p-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200/70 sm:aspect-[16/11] sm:size-auto sm:w-full dark:from-neutral-800/60 dark:to-neutral-900">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center text-neutral-400 dark:text-neutral-600">
              <GiftIcon />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {item.kind === 'fund' ? 'Cash fund' : `No. ${String(index + 1).padStart(2, '0')}`}
          </span>
          <h2 className="font-display text-[22px] leading-tight font-medium">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noreferrer nofollow" className="underline-offset-4 hover:underline">
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </h2>
          {item.priceNgn ? (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {item.kind === 'fund' ? 'Goal ' : ''}
              {naira(item.priceNgn)}
              {item.priceUsd ? <span className="text-neutral-400 dark:text-neutral-500"> · about ${item.priceUsd}</span> : null}
            </span>
          ) : (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Give any amount</span>
          )}
          {item.note && <p className="mt-1 text-sm leading-snug text-neutral-500 dark:text-neutral-400">{item.note}</p>}
        </div>
      </div>

      <div className="relative flex flex-col gap-2.5 px-3.5 pb-3.5 sm:px-4 sm:pb-4">
        {item.state === 'open' && (
          <>
            {item.percent !== null && item.canContribute && (
              <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                <Bar percent={item.percent} />
                <span className="w-10 text-right">{item.percent}%</span>
              </div>
            )}
            <div className="flex gap-2.5">
              {acceptsMoney && item.canContribute && (
                <button type="button" onClick={onContribute} className={`min-h-10 flex-1 px-3 text-sm ${primaryButton}`}>
                  Contribute
                </button>
              )}
              {item.canReserve && (
                <button type="button" onClick={onReserve} className={`min-h-10 flex-1 px-3 text-sm ${secondaryButton}`}>
                  Reserve to buy
                </button>
              )}
            </div>
          </>
        )}
        {item.state === 'reserved' && <p className="font-editorial text-[22px] text-neutral-500 dark:text-neutral-400">Reserved by a guest</p>}
        {item.state === 'funded' && <p className="font-editorial text-[22px] text-emerald-800 dark:text-emerald-300">Fully gifted, thank you</p>}
      </div>
    </article>
  )
}

function ContributeDialog({ item, ownerFirstName, min, onClose }: { item: PublicItem; ownerFirstName: string; min: number; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const remaining = item.remainingNgn
  const quick = [5000, 10000, 20000, 50000].filter((v) => remaining === null || v < remaining)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    const res = await contributeFn({
      data: {
        itemId: item.id,
        amountNgn: Number(amount),
        name: String(form.get('name') ?? '') || undefined,
        email: String(form.get('email') ?? ''),
        message: String(form.get('message') ?? '') || undefined,
      },
    }).catch(() => ({ ok: false as const, error: 'Please check the details and try again.' }))
    if (res.ok) {
      window.location.href = res.authorizationUrl
      return
    }
    setBusy(false)
    setError(res.error)
  }

  return (
    <Dialog title={item.title} subtitle={remaining !== null ? `${naira(remaining)} to go` : 'Give any amount'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Amount (₦)">
          <input
            className={inputClass}
            inputMode="numeric"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder={`From ${min.toLocaleString()}`}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {quick.map((v) => (
            <button key={v} type="button" onClick={() => setAmount(String(v))} className={`min-h-9 px-3.5 text-sm ${secondaryButton}`}>
              {naira(v)}
            </button>
          ))}
          {remaining !== null && (
            <button type="button" onClick={() => setAmount(String(remaining))} className={`min-h-9 px-3.5 text-sm ${secondaryButton}`}>
              The rest ({naira(remaining)})
            </button>
          )}
        </div>
        <Field label="Your name" hint={`optional, only ${ownerFirstName} sees it`}>
          <input name="name" className={inputClass} autoComplete="name" maxLength={80} />
        </Field>
        <Field label="Email" hint="for your receipt">
          <input name="email" type="email" required className={inputClass} autoComplete="email" />
        </Field>
        <Field label={`A note for ${ownerFirstName}`} hint="optional">
          <textarea name="message" rows={2} maxLength={500} className={inputClass} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy || !amount} className={`min-h-12 text-[15px] ${primaryButton}`}>
          {busy ? 'Opening secure checkout…' : `Contribute ${amount ? naira(Number(amount)) : ''}`}
        </button>
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">Pay by card, bank transfer or USSD.</p>
      </form>
    </Dialog>
  )
}

function ReserveDialog({ item, ownerFirstName, onClose }: { item: PublicItem; ownerFirstName: string; onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    const res = await reserveFn({
      data: {
        itemId: item.id,
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        note: String(form.get('note') ?? '') || undefined,
      },
    }).catch(() => ({ ok: false as const, error: 'Please check the details and try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setDone(true)
    router.invalidate()
  }

  return (
    <Dialog title={item.title} subtitle="Reserve it, then buy it yourself" onClose={onClose}>
      {done ? (
        <p className="font-editorial text-3xl">It's yours to gift. Thank you!</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Other guests will see it as reserved, so nobody buys it twice.
            {item.link && (
              <>
                {' '}
                <a href={item.link} target="_blank" rel="noreferrer nofollow" className="underline underline-offset-4">
                  Here's where to find it.
                </a>
              </>
            )}
          </p>
          <Field label="Your name" hint={`only ${ownerFirstName} sees it`}>
            <input name="name" required className={inputClass} autoComplete="name" maxLength={80} />
          </Field>
          <Field label="Email" hint="optional">
            <input name="email" type="email" className={inputClass} autoComplete="email" />
          </Field>
          <Field label={`A note for ${ownerFirstName}`} hint="optional">
            <textarea name="note" rows={2} maxLength={300} className={inputClass} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <button type="submit" disabled={busy} className={`min-h-12 text-[15px] ${primaryButton}`}>
            {busy ? 'Reserving…' : 'Reserve this gift'}
          </button>
        </form>
      )}
    </Dialog>
  )
}
