import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useSignOut } from '@/components/auth'
import { ThemeToggle } from '@/components/theme'
import { Avatar, Glow, Logo, glassCard } from '@/components/ui'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    const user = context.viewer.user
    if (!user) throw redirect({ to: '/start' })
    if (!user.handle) throw redirect({ to: '/welcome' })
    return { user }
  },
  head: () => ({ meta: [{ title: 'Your wishlists · GiftMe' }, { name: 'robots', content: 'noindex' }] }),
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <nav className="flex items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="hidden items-center gap-5 text-sm text-neutral-600 sm:flex dark:text-neutral-400">
              <Link to="/dashboard" activeOptions={{ exact: true }} activeProps={{ className: 'text-neutral-900 dark:text-neutral-100' }}>
                Wishlists
              </Link>
              <Link to="/dashboard/friends" activeProps={{ className: 'text-neutral-900 dark:text-neutral-100' }}>
                Friends
              </Link>
              <Link to="/dashboard/settings" activeProps={{ className: 'text-neutral-900 dark:text-neutral-100' }}>
                Settings
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </nav>
        <div className="pt-10 pb-20">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function AccountMenu() {
  const { user, viewer } = Route.useRouteContext()
  const signOut = useSignOut(viewer.mode)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Account menu" className="cursor-pointer rounded-full">
        <Avatar src={user.avatarUrl} name={user.displayName} size={40} />
      </button>
      {open && (
        <div className={`absolute right-0 z-20 mt-2 w-56 rounded-2xl p-2 text-sm ${glassCard} bg-white/90 dark:bg-neutral-900/90`}>
          <div className="px-3 py-2">
            <p className="truncate">{user.displayName}</p>
            <p className="truncate text-xs text-neutral-500">@{user.handle}</p>
          </div>
          <MenuLink to="/dashboard" onClick={() => setOpen(false)}>
            Wishlists
          </MenuLink>
          <MenuLink to="/dashboard/friends" onClick={() => setOpen(false)}>
            Friends
          </MenuLink>
          <MenuLink to="/dashboard/settings" onClick={() => setOpen(false)}>
            Profile & payouts
          </MenuLink>
          <button
            type="button"
            onClick={() => signOut()}
            className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-neutral-900/5 dark:hover:bg-neutral-100/5"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, onClick, children }: { to: '/dashboard' | '/dashboard/friends' | '/dashboard/settings'; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link to={to} onClick={onClick} className="block rounded-lg px-3 py-2 hover:bg-neutral-900/5 dark:hover:bg-neutral-100/5">
      {children}
    </Link>
  )
}
