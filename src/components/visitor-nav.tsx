import { Link } from '@tanstack/react-router'
import { Avatar } from '@/components/ui'
import type { Profile } from '@/server/users'

/**
 * On someone's public page, a signed-in visitor gets a way home: their own picture and
 * "Your wishlists". On your own page it says so, and leads back to where you edit it.
 */
export function MyPagesLink({ me, ownerHandle }: { me: Profile | null | undefined; ownerHandle: string }) {
  if (!me) return null
  const mine = me.handle === ownerHandle
  return (
    <Link
      to="/dashboard"
      className="flex min-h-10 items-center gap-2 rounded-full border border-neutral-300/70 bg-white/60 py-1 pr-4 pl-1 text-sm backdrop-blur transition-colors hover:border-purple-300 dark:border-neutral-700/70 dark:bg-white/5"
    >
      <Avatar src={me.avatarUrl} name={me.displayName} size={30} />
      <span className="whitespace-nowrap">{mine ? 'Edit your wishlists' : 'Your wishlists'}</span>
    </Link>
  )
}
