import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { z } from 'zod'
import { AddFundDialog, AddGiftDialog, EditItemDialog } from '@/components/item-editor'
import { GuidedTour, useTour, type TourStep } from '@/components/guided-tour'
import { BankNeededNotice } from '@/components/onboarding'
import { ShareButtons } from '@/components/share'
import { Bar, Dialog, ErrorText, Field, ItemArt, Photo, StarIcon, glassCard } from '@/components/ui'
import { WishlistForm } from '@/components/wishlist-form'
import {
  addOfflineGiftFn,
  cancelReservationFn,
  deleteItemFn,
  deleteWishlistFn,
  getOwnerWishlistFn,
  reorderItemsFn,
  sendThankYouFn,
  setItemFlagsFn,
  updateWishlistFn,
} from '@/server/fns/owner'
import { countdownText, formatDate } from '@/lib/dates'
import { naira } from '@/lib/format'
import { occasion } from '@/lib/occasions'
import { inputClass, primaryButton, secondaryButton } from '@/lib/ui'

// The first time someone opens a wishlist, a GiftMe cursor walks them through the page.
const WISHLIST_TOUR: TourStep[] = [
  { target: 'title', title: 'This is your wishlist', body: 'Change the name, occasion or date any time with the pencil. Guests see a countdown to the day.' },
  { target: 'add', title: 'Add what you’d love', body: 'Paste a link from any shop, or type what you want and pick from shops that sell it. A cash fund works for bigger dreams.' },
  { target: 'gifts', title: 'Put them in order', body: 'Drag gifts to reorder them, and star the ones you want most. Guests see the same order.' },
  { target: 'bank', title: 'Add your bank account', body: 'Friends can only send money once you do. Every gift goes straight to your bank; GiftMe never holds it.' },
  { target: 'share', title: 'Share one link', body: 'Copy it or send it on WhatsApp. Friends don’t need an account to give.' },
  { target: 'guest', title: 'See what friends see', body: 'Open your list as a guest to check how it looks before you share it.' },
  { target: 'who-gave', title: 'Who gave, and thank you', body: 'Every gift, note and name lands here. Only you can see them, and you can send a thank-you in one tap.' },
]

export const Route = createFileRoute('/dashboard/w/$id')({
  validateSearch: z.object({ add: z.boolean().optional() }),
  loader: ({ params }) => getOwnerWishlistFn({ data: { id: params.id } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.wishlist.title ?? 'Wishlist'} · GiftMe` }] }),
  component: Editor,
})

type Data = Awaited<ReturnType<typeof getOwnerWishlistFn>>
type OwnerItem = Data['items'][number]
type Contribution = Data['contributions'][number]

type DialogState =
  | { kind: 'add-gift' }
  | { kind: 'add-fund' }
  | { kind: 'edit-item'; item: OwnerItem }
  | { kind: 'edit-list' }
  | { kind: 'offline'; item: OwnerItem }
  | { kind: 'thank'; contribution: Contribution }
  | null

function Editor() {
  const data = Route.useLoaderData()
  const { add } = Route.useSearch()
  const router = useRouter()
  const navigate = Route.useNavigate()
  // Coming straight from "Create wishlist" opens the add-a-gift dialog.
  const [dialog, setDialog] = useState<DialogState>(add ? { kind: 'add-gift' } : null)
  const tour = useTour('gm_tour_wishlist')
  const { wishlist, items, contributions, reservations, user } = data

  const shareUrl = `${data.siteUrl}/w/${user.handle}/${wishlist.slug}`
  const confirmed = contributions.filter((c) => c.status === 'success')
  const raised = items.reduce((sum, i) => sum + i.raisedNgn, 0)
  const countdown = wishlist.eventDate ? countdownText(wishlist.eventDate) : null

  const refresh = () => router.invalidate()
  const close = () => {
    setDialog(null)
    if (add) void navigate({ search: {}, replace: true })
  }
  const saved = async () => {
    close()
    await refresh()
  }

  // Local order so a dropped card stays put while the save happens.
  const [order, setOrder] = useState(() => items.map((i) => i.id))
  useEffect(() => setOrder(items.map((i) => i.id)), [items])
  const byId = new Map(items.map((i) => [i.id, i]))
  const ordered = order.map((id) => byId.get(id)).filter((i): i is OwnerItem => !!i)

  const sensors = useSensors(
    // A short move starts a drag, so plain clicks on Edit and ••• still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // On phones, press and hold to drag; a quick swipe still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)))
    setOrder(next)
    await reorderItemsFn({ data: { wishlistId: wishlist.id, ids: next } })
    await refresh()
  }

  return (
    <div className="flex flex-col gap-10">
      {tour.open && !dialog && <GuidedTour steps={WISHLIST_TOUR} onDone={tour.finish} />}
      <div className="flex flex-col gap-2">
        <Link to="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
          ← All wishlists
        </Link>
      </div>

      <header className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setDialog({ kind: 'edit-list' })}
            className="group inline-flex cursor-pointer items-center gap-2 self-start rounded-full text-left text-xs tracking-[0.14em] text-neutral-500 uppercase hover:text-purple-700 dark:text-neutral-400 dark:hover:text-purple-300"
            aria-label="Change occasion or date"
          >
            {occasion(wishlist.occasion).label}
            {wishlist.eventDate ? ` · ${formatDate(wishlist.eventDate)}` : ' · add a date'}
            {countdown && ` · ${countdown}`}
            <PencilIcon size={12} />
          </button>
          <div className="group flex items-start gap-3" data-tour="title">
            <h1 className="font-display text-5xl leading-none sm:text-6xl">{wishlist.title}</h1>
            <button
              type="button"
              onClick={() => setDialog({ kind: 'edit-list' })}
              aria-label="Edit wishlist details"
              className={`mt-1 grid size-10 shrink-0 place-items-center ${secondaryButton}`}
            >
              <PencilIcon />
            </button>
          </div>
          <p className="text-[15px] text-neutral-600 dark:text-neutral-400">
            {naira(raised)} raised from {confirmed.length} {confirmed.length === 1 ? 'gift' : 'gifts'}
            {reservations.length > 0 && ` · ${reservations.length} reserved`}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" onClick={() => setDialog({ kind: 'edit-list' })} className={`inline-flex min-h-10 items-center gap-2 px-4 text-sm ${secondaryButton}`}>
              <PencilIcon size={14} /> Edit occasion, date & title
            </button>
            <a
              href={`/w/${user.handle}/${wishlist.slug}`}
              target="_blank"
              rel="noreferrer"
              data-tour="guest"
              className={`inline-flex min-h-10 items-center px-4 text-sm ${secondaryButton}`}
            >
              View as a guest ↗
            </a>
            <button type="button" onClick={tour.start} className="inline-flex min-h-10 cursor-pointer items-center px-3 text-sm text-neutral-500 hover:text-purple-700 dark:text-neutral-400 dark:hover:text-purple-300">
              Take the tour
            </button>
          </div>
        </div>
        <div data-tour="share" className={`flex flex-col gap-3 rounded-2xl p-5 ${glassCard}`}>
          <p className="font-display text-2xl">Share your wishlist</p>
          <ShareButtons url={shareUrl} title={wishlist.title} />
        </div>
        {!user.bank && (
          <div data-tour="bank" className="lg:col-span-2">
            <BankNeededNotice />
          </div>
        )}
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl">Gifts & funds</h2>
          <div className="flex gap-2" data-tour="add">
            <button type="button" onClick={() => setDialog({ kind: 'add-gift' })} className={`min-h-10 px-4 text-sm ${primaryButton}`}>
              Add a gift
            </button>
            <button type="button" onClick={() => setDialog({ kind: 'add-fund' })} className={`min-h-10 px-4 text-sm ${secondaryButton}`}>
              Add a cash fund
            </button>
          </div>
        </div>
        {items.length === 0 ? (
          <button
            type="button"
            onClick={() => setDialog({ kind: 'add-gift' })}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl px-6 py-14 text-center ${glassCard}`}
          >
            <span className="font-editorial text-4xl">Add your first gift</span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Paste a link from any shop and we'll fill in the rest.</span>
          </button>
        ) : (
          <>
            <p className="-mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Drag gifts to reorder them; guests see this order. Star the ones you want most.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-2.5" data-tour="gifts">
                  {ordered.map((item) => (
                    <OwnerItemRow
                      key={item.id}
                      item={item}
                      onEdit={() => setDialog({ kind: 'edit-item', item })}
                      onOffline={() => setDialog({ kind: 'offline', item })}
                      onChanged={refresh}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4" data-tour="who-gave">
        <h2 className="font-display text-3xl">Who gave</h2>
        <p className="-mt-2 text-sm text-neutral-500 dark:text-neutral-400">Only you can see names, amounts and notes.</p>
        <div className={`overflow-x-auto rounded-2xl ${glassCard}`}>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-normal">When</th>
                <th className="px-4 py-3 font-normal">From</th>
                <th className="px-4 py-3 font-normal">For</th>
                <th className="px-4 py-3 font-normal">Amount</th>
                <th className="px-4 py-3 font-normal">Note</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c.reference} className="border-t border-neutral-200/80 align-top dark:border-neutral-800">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-3">
                    {c.name ?? 'Anonymous'}
                    {c.email && <div className="text-xs text-neutral-500">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3">{c.item}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {naira(c.amountNgn)}
                    {c.status !== 'success' && <div className="text-xs text-amber-700 dark:text-amber-400">{c.status === 'pending' ? 'pending' : c.status}</div>}
                    {c.source === 'offline' && <div className="text-xs text-neutral-500">recorded by you</div>}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-neutral-600 dark:text-neutral-400">{c.message}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {c.status === 'success' && c.email && (
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'thank', contribution: c })}
                        className={`min-h-8 px-3 text-xs ${c.thanked ? secondaryButton : primaryButton}`}
                      >
                        {c.thanked ? 'Thanked ✓' : 'Say thank you'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {contributions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    No gifts yet. Share your link to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {reservations.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-3xl">Reserved to buy</h2>
          <ul className="flex flex-col gap-2.5">
            {reservations.map((r) => (
              <li key={r.itemId} className={`flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between ${glassCard}`}>
                <div className="text-sm">
                  <p className="font-display text-xl">{r.item}</p>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {r.name}
                    {r.email && ` · ${r.email}`}
                    {r.note && ` · “${r.note}”`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Release ${r.item} so others can give toward it again?`)) return
                    await cancelReservationFn({ data: { itemId: r.itemId } })
                    await refresh()
                  }}
                  className={`min-h-9 shrink-0 self-start px-3.5 text-sm sm:self-auto ${secondaryButton}`}
                >
                  Release
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DangerZone wishlistId={wishlist.id} />

      {dialog?.kind === 'add-gift' && (
        <AddGiftDialog wishlistId={wishlist.id} searchEnabled={data.searchEnabled} usdRate={data.usdRate} onClose={close} onSaved={saved} />
      )}
      {dialog?.kind === 'add-fund' && <AddFundDialog wishlistId={wishlist.id} onClose={close} onSaved={saved} />}
      {dialog?.kind === 'edit-item' && <EditItemDialog item={dialog.item} usdRate={data.usdRate} onClose={close} onSaved={saved} />}
      {dialog?.kind === 'offline' && <OfflineGiftDialog item={dialog.item} onClose={close} onSaved={saved} />}
      {dialog?.kind === 'thank' && <ThankYouDialog contribution={dialog.contribution} ownerName={user.displayName} onClose={close} onSaved={saved} />}
      {dialog?.kind === 'edit-list' && (
        <Dialog title="Wishlist details" onClose={close} wide>
          <WishlistForm
            initial={{
              occasion: wishlist.occasion as never,
              title: wishlist.title,
              eventDate: wishlist.eventDate,
              intro: wishlist.intro,
              coverUrl: wishlist.coverUrl,
              coverPos: wishlist.coverPos,
            }}
            owner={user}
            submitLabel="Save"
            onSubmit={async (values) => {
              const res = await updateWishlistFn({ data: { id: wishlist.id, ...values } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
              if (!res.ok) return res.error
              await saved()
              return null
            }}
          />
        </Dialog>
      )}
    </div>
  )
}

function OwnerItemRow({
  item,
  onEdit,
  onOffline,
  onChanged,
}: {
  item: OwnerItem
  onEdit: () => void
  onOffline: () => void
  onChanged: () => void
}) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [star, setStar] = useState(item.mostWanted)
  // The menu closes when you click anywhere else or press Esc.
  useEffect(() => {
    if (!menu) return
    const away = (e: PointerEvent) => menuRef.current?.contains(e.target as Node) || setMenu(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])
  useEffect(() => setStar(item.mostWanted), [item.mostWanted])
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  async function toggleStar() {
    setStar((v) => !v)
    await setItemFlagsFn({ data: { id: item.id, mostWanted: !star } })
    onChanged()
  }

  async function flag(flags: { hidden?: boolean; received?: boolean }) {
    setMenu(false)
    await setItemFlagsFn({ data: { id: item.id, ...flags } })
    onChanged()
  }

  async function remove() {
    setMenu(false)
    if (!confirm(`Delete “${item.title}”?`)) return
    const res = await deleteItemFn({ data: { id: item.id } })
    if (!res.ok) return setError(res.error)
    onChanged()
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable gift"
      className={`relative flex cursor-grab touch-manipulation flex-col gap-3 rounded-2xl p-3.5 select-none active:cursor-grabbing sm:flex-row sm:items-center ${glassCard} ${
        item.hidden ? 'opacity-60' : ''
      } ${isDragging ? 'z-30 scale-[1.01] shadow-xl shadow-purple-500/10 ring-1 ring-purple-300/60' : ''} ${menu ? 'z-20' : ''}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">
          <GripIcon />
        </span>
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-400 dark:from-neutral-800/60 dark:to-neutral-900 dark:text-neutral-600">
          {item.imageUrl ? <Photo src={item.imageUrl} /> : <ItemArt kind={item.kind} compact />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display truncate text-xl leading-tight">{item.title}</span>
            {star && <Badge tone="star">Most wanted</Badge>}
            {item.kind === 'fund' && <Badge>Cash fund</Badge>}
            {item.kind === 'gift' && !item.allowMoney && <Badge>Buy only</Badge>}
            {item.kind === 'gift' && !item.allowReserve && item.allowMoney && <Badge>Money only</Badge>}
            {item.hidden && <Badge>Hidden</Badge>}
            {item.received && <Badge tone="green">Received</Badge>}
            {item.reserved && <Badge>Reserved</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="shrink-0">
              {naira(item.raisedNgn)}
              {item.priceNgn ? ` of ${naira(item.priceNgn)}` : ' raised'}
            </span>
            {item.percent !== null && (
              <div className="hidden max-w-48 flex-1 sm:flex">
                <Bar percent={item.percent} />
              </div>
            )}
          </div>
          <ErrorText>{error}</ErrorText>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={toggleStar}
          aria-pressed={star}
          aria-label={star ? 'Remove most wanted' : 'Mark as most wanted'}
          title={star ? 'Most wanted' : 'Mark as most wanted'}
          className={`grid min-h-9 min-w-9 cursor-pointer place-items-center rounded-full border transition-colors ${
            star
              ? 'border-amber-300/70 bg-amber-400/15 text-amber-500'
              : 'border-neutral-300/70 bg-white/40 text-neutral-400 hover:text-amber-500 dark:border-neutral-700 dark:bg-white/5'
          }`}
        >
          <StarIcon filled={star} />
        </button>
        <button type="button" onClick={onEdit} className={`min-h-9 px-3.5 text-sm ${secondaryButton}`}>
          Edit
        </button>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="More actions"
            aria-expanded={menu}
            className={`min-h-9 px-3 text-sm ${secondaryButton}`}
          >
            •••
          </button>
          {menu && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-neutral-200/80 bg-white p-1.5 text-sm shadow-xl shadow-purple-950/10 dark:border-neutral-800 dark:bg-neutral-900">
              <MenuButton onClick={() => flag({ hidden: !item.hidden })}>{item.hidden ? 'Show to guests' : 'Hide from guests'}</MenuButton>
              {item.kind === 'gift' && (
                <MenuButton onClick={() => flag({ received: !item.received })}>{item.received ? 'Not received yet' : 'Mark as received'}</MenuButton>
              )}
              <MenuButton
                onClick={() => {
                  setMenu(false)
                  onOffline()
                }}
              >
                Record a cash/transfer gift
              </MenuButton>
              <MenuButton onClick={remove} danger>
                Delete
              </MenuButton>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function GripIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
      {[4, 10, 16].map((y) => (
        <g key={y}>
          <circle cx="4" cy={y} r="1.6" />
          <circle cx="10" cy={y} r="1.6" />
        </g>
      ))}
    </svg>
  )
}

function PencilIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: 'green' | 'star' }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] ${
        tone === 'green'
          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
          : tone === 'star'
            ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300'
            : 'bg-neutral-900/5 text-neutral-600 dark:bg-neutral-100/10 dark:text-neutral-300'
      }`}
    >
      {children}
    </span>
  )
}

function MenuButton({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-neutral-900/5 dark:hover:bg-neutral-100/5 ${danger ? 'text-red-700 dark:text-red-400' : ''}`}
    >
      {children}
    </button>
  )
}

function OfflineGiftDialog({ item, onClose, onSaved }: { item: OwnerItem; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    const res = await addOfflineGiftFn({
      data: {
        itemId: item.id,
        amountNgn: Number(form.get('amount')),
        name: String(form.get('name') ?? '') || undefined,
        note: String(form.get('note') ?? '') || undefined,
      },
    }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onSaved()
  }

  return (
    <Dialog title="Record a gift" subtitle={`Money someone gave you directly toward ${item.title}.`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Amount (₦)">
          <input name="amount" className={inputClass} inputMode="numeric" required pattern="\d+" />
        </Field>
        <Field label="From" hint="optional">
          <input name="name" className={inputClass} maxLength={80} />
        </Field>
        <Field label="Note" hint="optional">
          <input name="note" className={inputClass} maxLength={300} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy} className={`min-h-12 text-[15px] ${primaryButton}`}>
          {busy ? 'Saving…' : 'Record gift'}
        </button>
      </form>
    </Dialog>
  )
}

function ThankYouDialog({
  contribution,
  ownerName,
  onClose,
  onSaved,
}: {
  contribution: Contribution
  ownerName: string
  onClose: () => void
  onSaved: () => void
}) {
  const first = contribution.name?.split(' ')[0]
  const [note, setNote] = useState(
    `Thank you so much${first ? `, ${first}` : ''}! Your gift means a lot to me.\n\nWith love,`,
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const res = await sendThankYouFn({ data: { reference: contribution.reference, note } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onSaved()
  }

  return (
    <Dialog title="Say thank you" subtitle={`We'll email ${contribution.email} from ${ownerName}.`} onClose={onClose}>
      <form onSubmit={send} className="flex flex-col gap-4">
        <textarea className={inputClass} rows={6} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} required />
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy} className={`min-h-12 text-[15px] ${primaryButton}`}>
          {busy ? 'Sending…' : 'Send thank-you note'}
        </button>
      </form>
    </Dialog>
  )
}

function DangerZone({ wishlistId }: { wishlistId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  return (
    <section className="border-t border-neutral-200/80 pt-8 dark:border-neutral-800">
      <button
        type="button"
        onClick={async () => {
          if (!confirm('Delete this wishlist? This cannot be undone.')) return
          const res = await deleteWishlistFn({ data: { id: wishlistId } })
          if (!res.ok) return setError(res.error)
          await router.navigate({ to: '/dashboard' })
        }}
        className="cursor-pointer text-sm text-red-700 underline underline-offset-4 dark:text-red-400"
      >
        Delete this wishlist
      </button>
      <div className="mt-2">
        <ErrorText>{error}</ErrorText>
      </div>
    </section>
  )
}
