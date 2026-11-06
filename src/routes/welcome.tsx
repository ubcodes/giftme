import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { FindabilityForm } from '@/components/friends'
import { PayoutForm } from '@/components/payout-form'
import { ProfileForm } from '@/components/profile-form'
import { ThemeToggle } from '@/components/theme'
import { Glow, Logo, glassCard } from '@/components/ui'
import { suggestHandleFn } from '@/server/fns/account'
import { getPayoutSetupFn } from '@/server/fns/owner'

export const Route = createFileRoute('/welcome')({
  beforeLoad: ({ context }) => {
    const user = context.viewer.user
    if (!user) throw redirect({ to: '/start' })
    if (user.handle) throw redirect({ to: '/dashboard' })
    if (!context.viewer.canJoin) throw redirect({ to: '/', search: { joined: 'pending' } })
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
  // Three short steps: who you are, how friends find you, where gifts go. The last two can be skipped.
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [banks, setBanks] = useState<{ name: string; code: string }[] | null>(null)
  const finish = () => router.navigate({ to: '/dashboard/new' })
  useEffect(() => {
    if (step !== 3 || banks) return
    getPayoutSetupFn()
      .then((r) => setBanks(r.banks))
      .catch(() => setBanks([]))
  }, [step, banks])

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
            <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Step {step} of 3</p>
            {step === 1 ? (
              <>
                <h1 className="font-display mt-2 text-5xl leading-none sm:text-6xl">
                  <span className="font-editorial text-6xl sm:text-7xl">Welcome</span>, {user.displayName.split(' ')[0]}
                </h1>
                <p className="mt-3 text-[15px] text-neutral-600 dark:text-neutral-400">A photo and a link name, and you're ready.</p>
              </>
            ) : step === 2 ? (
              <>
                <h1 className="font-display mt-2 text-5xl leading-none sm:text-6xl">
                  Let friends <span className="font-editorial text-6xl sm:text-7xl">find you</span>
                </h1>
                <p className="mx-auto mt-3 max-w-md text-[15px] text-neutral-600 dark:text-neutral-400">
                  Add your number and socials so friends who have them can find your wishlists on GiftMe. You can change this any time.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display mt-2 text-5xl leading-none sm:text-6xl">
                  Where should <span className="font-editorial text-6xl sm:text-7xl">gifts</span> go?
                </h1>
                <p className="mx-auto mt-3 max-w-md text-[15px] text-neutral-600 dark:text-neutral-400">
                  Add the bank account your gifts should land in. Every naira friends send goes straight to it, and GiftMe never holds your
                  money.
                </p>
              </>
            )}
          </div>
          <div className={`w-full max-w-md rounded-3xl p-6 ${glassCard}`}>
            {step === 1 ? (
              <ProfileForm user={user} initialHandle={handle} submitLabel="Continue" onSaved={() => setStep(2)} />
            ) : step === 2 ? (
              <FindabilityForm me={user} submitLabel="Continue" switchOnWhenFilled onSaved={() => setStep(3)} />
            ) : banks ? (
              <PayoutForm banks={banks} current={null} onSaved={finish} />
            ) : (
              <p className="py-6 text-center text-sm text-neutral-500">Loading banks…</p>
            )}
          </div>
          {step > 1 && (
            <button type="button" onClick={() => (step === 2 ? setStep(3) : finish())} className="cursor-pointer text-sm text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400">
              {step === 2 ? 'Skip for now' : 'I’ll add it later'}
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
