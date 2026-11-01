import { createFileRoute, useRouter } from '@tanstack/react-router'
import { glassCard } from '@/components/ui'
import { WishlistForm } from '@/components/wishlist-form'
import { createWishlistFn } from '@/server/fns/owner'

export const Route = createFileRoute('/dashboard/new')({
  head: () => ({ meta: [{ title: 'New wishlist · GiftMe' }] }),
  component: NewWishlist,
})

function NewWishlist() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">New wishlist</p>
        <h1 className="font-display mt-2 text-5xl leading-none">
          What are we <span className="font-editorial text-6xl">celebrating</span>?
        </h1>
      </div>
      <div className={`rounded-3xl p-6 sm:p-8 ${glassCard}`}>
        <WishlistForm
          ownerFirstName={user.displayName.split(' ')[0]}
          submitLabel="Create wishlist"
          onSubmit={async (values) => {
            const res = await createWishlistFn({ data: values }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
            if (!res.ok) return res.error
            await router.navigate({ to: '/dashboard/w/$id', params: { id: res.id }, search: { add: true } })
            return null
          }}
        />
      </div>
    </div>
  )
}
