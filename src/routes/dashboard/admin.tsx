import { createFileRoute, notFound } from '@tanstack/react-router'
import { glassCard } from '@/components/ui'
import { naira } from '@/lib/format'
import { getAdminStatsFn } from '@/server/fns/owner'

export const Route = createFileRoute('/dashboard/admin')({
  beforeLoad: ({ context }) => {
    if (!context.viewer.isAdmin) throw notFound()
  },
  loader: () => getAdminStatsFn(),
  head: () => ({ meta: [{ title: 'Numbers · GiftMe' }] }),
  component: Admin,
})

/** How GiftMe is doing: people, lists and gifts. Only emails in ADMIN_EMAILS can open it. */
function Admin() {
  const { totals: t, byDay, recent } = Route.useLoaderData()
  const peak = Math.max(1, ...byDay.map((d) => d.n))
  const cards = [
    { label: 'People signed up', value: t.users.toLocaleString(), note: `${t.usersWeek} this week` },
    { label: 'Finished their profile', value: t.profiles.toLocaleString(), note: `${pct(t.profiles, t.users)} of sign-ups` },
    { label: 'Added a bank account', value: t.withBank.toLocaleString(), note: `${pct(t.withBank, t.profiles)} of profiles` },
    { label: 'Findable by friends', value: t.findable.toLocaleString(), note: 'Switched on “Let friends find me”' },
    { label: 'Wishlists', value: t.wishlists.toLocaleString(), note: `${t.items.toLocaleString()} gifts and funds on them` },
    { label: 'Gifts given', value: t.gifts.toLocaleString(), note: `${t.giftsWeek} this week · ${t.reservations} reserved` },
    { label: 'Money given', value: naira(t.raisedNgn), note: 'Confirmed payments, all time' },
  ]
  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Only you can see this</p>
        <h1 className="font-display mt-2 text-5xl leading-none">
          GiftMe in <span className="font-editorial text-6xl">numbers</span>
        </h1>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className={`flex flex-col gap-1 rounded-2xl p-5 ${glassCard}`}>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{c.label}</span>
            <span className="font-display text-4xl leading-tight tabular-nums">{c.value}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{c.note}</span>
          </li>
        ))}
      </ul>

      <section className={`rounded-2xl p-5 sm:p-6 ${glassCard}`}>
        <h2 className="font-display text-2xl">Sign-ups, last 14 days</h2>
        <div className="mt-5 flex h-40 items-end gap-1.5" role="img" aria-label={byDay.map((d) => `${d.day}: ${d.n}`).join(', ')}>
          {byDay.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col justify-end gap-1.5" title={`${d.day}: ${d.n}`}>
              <span className="text-center text-[11px] text-neutral-500 tabular-nums">{d.n || ''}</span>
              <div className="rounded-t-md bg-purple-500/70" style={{ height: `${(d.n / peak) * 100}%`, minHeight: d.n ? 4 : 1 }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
          <span>{byDay[0].day.slice(5)}</span>
          <span>today</span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Newest people</h2>
        <ul className={`divide-y divide-neutral-200/70 rounded-2xl dark:divide-neutral-800 ${glassCard}`}>
          {recent.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span className="min-w-0 truncate">
                {r.name} {r.handle ? <span className="text-neutral-500">@{r.handle}</span> : <span className="text-neutral-500">· profile not finished</span>}
              </span>
              <span className="shrink-0 text-neutral-500 tabular-nums">
                {r.lists} {r.lists === 1 ? 'list' : 'lists'} · {new Date(r.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '0%')
