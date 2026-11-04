import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { FindabilityForm } from '@/components/friends'
import { PayoutForm } from '@/components/payout-form'
import { ProfileForm } from '@/components/profile-form'
import { glassCard } from '@/components/ui'
import { getPayoutSetupFn } from '@/server/fns/owner'

export const Route = createFileRoute('/dashboard/settings')({
  loader: () => getPayoutSetupFn(),
  head: () => ({ meta: [{ title: 'Settings · GiftMe' }] }),
  component: Settings,
})

function Settings() {
  const { user, banks, feePercent } = Route.useLoaderData()
  const router = useRouter()
  const [saved, setSaved] = useState(false)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <div>
        <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Settings</p>
        <h1 className="font-display mt-2 text-5xl leading-none">Profile, payouts & friends</h1>
      </div>

      <section className={`rounded-3xl p-6 sm:p-8 ${glassCard}`}>
        <h2 className="font-display mb-5 text-3xl">Profile</h2>
        <ProfileForm
          user={user}
          initialHandle={user.handle ?? ''}
          submitLabel={saved ? 'Saved' : 'Save profile'}
          onSaved={async () => {
            setSaved(true)
            await router.invalidate()
            setTimeout(() => setSaved(false), 2000)
          }}
        />
      </section>

      <section id="payouts" className={`scroll-mt-10 rounded-3xl p-6 sm:p-8 ${glassCard}`}>
        <h2 className="font-display text-3xl">Where gifts go</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Each gift goes straight to your bank, the next business day after it's given (a Friday gift arrives on Monday). GiftMe never holds your money.
          {feePercent > 0 && ` A ${feePercent}% GiftMe fee is taken from each gift.`} A small card processing fee comes out of
          each gift.
        </p>
        <PayoutForm banks={banks} current={user.bank} onSaved={() => router.invalidate()} />
      </section>

      <section id="friends" className={`scroll-mt-10 rounded-3xl p-6 sm:p-8 ${glassCard}`}>
        <h2 className="font-display text-3xl">Friends & socials</h2>
        <p className="mt-2 mb-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Help friends find your wishlists on GiftMe. Your contact details are only used to match you with people who already have them.
        </p>
        <FindabilityForm me={user} onSaved={() => router.invalidate()} />
      </section>
    </div>
  )
}
