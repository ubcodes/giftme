import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { FindabilityForm } from '@/components/friends'
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
  // Two short steps: who you are, then how friends can find you. The second can be skipped.
  const [step, setStep] = useState<1 | 2>(1)
  const finish = () => router.navigate({ to: '/dashboard/new' })

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
            <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Step {step} of 2</p>
            {step === 1 ? (
              <>
                <h1 className="font-display mt-2 text-5xl leading-none sm:text-6xl">
                  <span className="font-editorial text-6xl sm:text-7xl">Welcome</span>, {user.displayName.split(' ')[0]}
                </h1>
                <p className="mt-3 text-[15px] text-neutral-600 dark:text-neutral-400">A photo and a link name, and you're ready.</p>
              </>
            ) : (
              <>
                <h1 className="font-display mt-2 text-5xl leading-none sm:text-6xl">
                  Let friends <span className="font-editorial text-6xl sm:text-7xl">find you</span>
                </h1>
                <p className="mx-auto mt-3 max-w-md text-[15px] text-neutral-600 dark:text-neutral-400">
                  Add your number and socials so friends who have them can find your wishlists on GiftMe. You can change this any time.
                </p>
              </>
            )}
          </div>
          <div className={`w-full max-w-md rounded-3xl p-6 ${glassCard}`}>
            {step === 1 ? (
              <ProfileForm user={user} initialHandle={handle} submitLabel="Continue" onSaved={() => setStep(2)} />
            ) : (
              <FindabilityForm me={user} submitLabel="Continue" switchOnWhenFilled onSaved={finish} />
            )}
          </div>
          {step === 2 && (
            <button type="button" onClick={finish} className="cursor-pointer text-sm text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400">
              Skip for now
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
