import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme'
import { Avatar, Glow, Logo, glassCard } from '@/components/ui'
import { getPublicProfileFn } from '@/server/fns/guest'
import { formatDate } from '@/lib/dates'
import { occasion } from '@/lib/occasions'

export const Route = createFileRoute('/w/$handle/')({
  loader: async ({ params }) => {
    const data = await getPublicProfileFn({ data: { handle: params.handle } })
    if (!data.found) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.found ? `${loaderData.owner.displayName} · GiftMe` : 'GiftMe' }] }),
  component: Profile,
})

function Profile() {
  const data = Route.useLoaderData()
  if (!data.found) return null
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
        <nav className="flex items-center justify-between pt-6">
          <Logo />
          <ThemeToggle />
        </nav>
        <header className="flex flex-col items-center gap-4 pt-16 pb-10 text-center">
          <Avatar src={data.owner.avatarUrl} name={data.owner.displayName} size={96} />
          <h1 className="font-display text-5xl">{data.owner.displayName}</h1>
        </header>
        <main className="flex flex-col gap-3 pb-20">
          {data.wishlists.length === 0 && <p className="text-center text-neutral-500">No wishlists yet.</p>}
          {data.wishlists.map((w) => (
            <Link
              key={w.slug}
              to="/w/$handle/$slug"
              params={{ handle: data.owner.handle, slug: w.slug }}
              className={`flex items-center justify-between gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5 ${glassCard}`}
            >
              <div>
                <p className="font-display text-2xl leading-tight">{w.title}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {occasion(w.occasion).label}
                  {w.eventDate && ` · ${formatDate(w.eventDate)}`}
                </p>
              </div>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </main>
      </div>
    </div>
  )
}
