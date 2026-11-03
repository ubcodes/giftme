import { Link, createFileRoute } from '@tanstack/react-router'
import { GettingStarted } from '@/components/onboarding'
import { Photo, glassCard } from '@/components/ui'
import { getDashboardFn } from '@/server/fns/owner'
import { naira } from '@/lib/format'
import { occasion } from '@/lib/occasions'
import { formatDate } from '@/lib/dates'
import { primaryButton } from '@/lib/ui'

export const Route = createFileRoute('/dashboard/')({
  loader: () => getDashboardFn(),
  component: Dashboard,
})

function Dashboard() {
  const { user, wishlists } = Route.useLoaderData()
  const total = wishlists.reduce((sum, w) => sum + w.raisedNgn, 0)

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Your wishlists</p>
          <h1 className="font-display mt-2 text-5xl leading-none">
            Hello, <span className="font-editorial text-6xl">{user.displayName.split(' ')[0]}</span>
          </h1>
          {wishlists.length > 0 && (
            <p className="mt-3 text-[15px] text-neutral-600 dark:text-neutral-400">
              {naira(total)} raised across {wishlists.length} {wishlists.length === 1 ? 'wishlist' : 'wishlists'}.
            </p>
          )}
        </div>
        <Link to="/dashboard/new" className={`inline-flex min-h-11 items-center self-start px-5 text-[15px] sm:self-auto ${primaryButton}`}>
          New wishlist
        </Link>
      </header>

      <GettingStarted
        hasPhoto={!!user.avatarUrl}
        firstWishlistId={(wishlists.find((w) => w.items === 0) ?? wishlists[0])?.id ?? null}
        hasGift={wishlists.some((w) => w.items > 0)}
        hasBank={!!user.bank}
        findable={user.discoverable}
      />

      {wishlists.length === 0 ? (
        <div className={`flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center ${glassCard}`}>
          <p className="font-editorial text-5xl">Nothing here yet</p>
          <p className="max-w-sm text-[15px] text-neutral-600 dark:text-neutral-400">
            Start with an occasion. You can add gifts by pasting a link from any shop.
          </p>
          <Link to="/dashboard/new" className={`mt-2 inline-flex min-h-11 items-center px-5 text-[15px] ${primaryButton}`}>
            Create your first wishlist
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((w) => (
            <Link
              key={w.id}
              to="/dashboard/w/$id"
              params={{ id: w.id }}
              className={`group relative flex flex-col overflow-hidden rounded-2xl transition-transform hover:-translate-y-0.5 ${glassCard}`}
            >
              <div className="aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-purple-200/60 via-pink-200/50 to-blue-200/60 dark:from-purple-500/20 dark:via-pink-500/10 dark:to-blue-500/20">
                {w.coverUrl && <Photo src={w.coverUrl} position={w.coverPos} />}
              </div>
              <div className="flex flex-col gap-1 p-5">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {occasion(w.occasion).label}
                  {w.eventDate && ` · ${formatDate(w.eventDate)}`}
                </span>
                <span className="font-display text-2xl leading-tight">{w.title}</span>
                <span className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {naira(w.raisedNgn)} raised · {w.items} {w.items === 1 ? 'item' : 'items'} · {w.gifts} {w.gifts === 1 ? 'gift' : 'gifts'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
