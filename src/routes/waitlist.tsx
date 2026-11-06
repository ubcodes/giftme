import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Waitlist } from '@/components/waitlist'
import { getWaitlistCountFn } from '@/server/fns/waitlist'

export const Route = createFileRoute('/waitlist')({
  validateSearch: z.object({ ref: z.string().max(20).optional(), joined: z.string().max(20).optional() }),
  loader: () => getWaitlistCountFn(),
  head: () => ({ meta: [{ title: 'Join the waitlist · GiftMe' }] }),
  component: WaitlistPage,
})

function WaitlistPage() {
  const { viewer } = Route.useRouteContext()
  const { count } = Route.useLoaderData()
  const search = Route.useSearch()
  return (
    <Waitlist
      count={count}
      referral={search.ref}
      pending={search.joined === 'pending'}
      signedIn={!!viewer.user}
      hasProfile={!!viewer.user?.handle}
    />
  )
}
