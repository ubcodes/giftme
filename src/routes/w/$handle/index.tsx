import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { FollowButton, SocialLinks } from '@/components/friends'
import { ThemeToggle } from '@/components/theme'
import { Avatar, Glow, Logo, glassCard } from '@/components/ui'
import { shareMeta } from '@/lib/share'
import { getPublicProfileFn } from '@/server/fns/guest'
import { formatDate } from '@/lib/dates'
import { occasion } from '@/lib/occasions'

export const Route = createFileRoute('/w/$handle/')({
  loader: async ({ params }) => {
    const data = await getPublicProfileFn({ data: { handle: params.handle } })
    if (!data.found) throw notFound()
    return data
  },
  head: ({ loaderData, params }) => {
    if (!loaderData?.found) return { meta: [{ title: 'GiftMe' }] }
    const description = `See ${loaderData.owner.displayName}'s wishlists on GiftMe and send a gift.`
    return {
      meta: [
        { title: `${loaderData.owner.displayName} · GiftMe` },
        { name: 'description', content: description },
        ...shareMeta({
          siteUrl: loaderData.siteUrl,
          title: `${loaderData.owner.displayName}'s wishlists`,
          description,
          image: loaderData.owner.avatarUrl,
          path: `/w/${params.handle}`,
        }),
      ],
    }
  },
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
          <SocialLinks socials={data.owner.socials} className="justify-center" />
          {data.follow && <FollowButton handle={data.owner.handle} following={data.follow.following} />}
        </header>
        <main className="flex flex-col gap-3 pb-20">
          {data.wishlists.length === 0 && (
            <div className={`flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center ${glassCard}`}>
              <p className="font-editorial text-4xl">Nothing to share yet</p>
              <p className="max-w-sm text-[15px] text-neutral-600 dark:text-neutral-400">
                {data.owner.displayName.split(' ')[0]} hasn't published a wishlist. Check back closer to the big day.
              </p>
            </div>
          )}
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
