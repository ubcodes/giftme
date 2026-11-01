import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { ProfileForm } from '@/components/profile-form'
import { ThemeToggle } from '@/components/theme'
import { Glow, Logo, glassCard } from '@/components/ui'
import { suggestHandleFn } from '@/server/fns/account'

export const Route = createFileRoute('/welcome')({
  beforeLoad: ({ context }) => {
    const user = context.viewer.user
    if (!user) throw redirect({ to: '/start' })
    if (user.handle) throw redirect({ to: '/dashboard' })
    return { user }
  },
  loader: () => suggestHandleFn(),
  head: () => ({ meta: [{ title: 'Welcome · GiftMe' }] }),
  component: Welcome,
})

function Welcome() {
  const { user } = Route.useRouteContext()
  const { handle } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
        <nav className="flex items-center justify-between pt-6">
          <Logo />
          <ThemeToggle />
        </nav>
        <main className="flex flex-1 flex-col items-center justify-center gap-8 py-12">
          <div className="text-center">
            <h1 className="font-display text-5xl leading-none sm:text-6xl">
              <span className="font-editorial text-6xl sm:text-7xl">Welcome</span>, {user.displayName.split(' ')[0]}
            </h1>
            <p className="mt-3 text-[15px] text-neutral-600 dark:text-neutral-400">A photo and a link name, and you're ready.</p>
          </div>
          <div className={`w-full max-w-md rounded-3xl p-6 ${glassCard}`}>
            <ProfileForm
              user={user}
              initialHandle={handle}
              submitLabel="Continue"
              onSaved={async () => {
                await router.invalidate()
                await router.navigate({ to: '/dashboard/new' })
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
