import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignInPanel } from '@/components/auth'
import { ThemeToggle } from '@/components/theme'
import { Glow, Logo, glassCard } from '@/components/ui'

export const Route = createFileRoute('/start')({
  beforeLoad: ({ context }) => {
    const user = context.viewer.user
    if (user) throw redirect({ to: user.handle ? '/dashboard' : '/welcome' })
  },
  head: () => ({ meta: [{ title: 'Sign in · GiftMe' }] }),
  component: Start,
})

function Start() {
  const { viewer } = Route.useRouteContext()
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
              Let's get you <span className="font-editorial text-6xl sm:text-7xl">started</span>
            </h1>
            <p className="mt-3 text-[15px] text-neutral-600 dark:text-neutral-400">
              Sign in with Google or a code sent to your email.
            </p>
          </div>
          <div className={`flex w-full max-w-md justify-center rounded-3xl p-2 sm:p-4 ${viewer.mode === 'clerk' ? '' : glassCard + ' !p-6'}`}>
            <SignInPanel mode={viewer.mode} redirectTo="/welcome" />
          </div>
        </main>
      </div>
    </div>
  )
}
