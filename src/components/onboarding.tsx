import { Link } from '@tanstack/react-router'
import { glassCard } from '@/components/ui'
import { primaryButton } from '@/lib/ui'

type Step = { done: boolean; title: string; body: string; action: React.ReactNode }

/** What a new owner still has to do before friends can give, in order. Hidden once everything is done. */
export function GettingStarted({
  hasPhoto,
  firstWishlistId,
  hasGift,
  hasBank,
}: {
  hasPhoto: boolean
  firstWishlistId: string | null
  hasGift: boolean
  hasBank: boolean
}) {
  const linkClass = `inline-flex min-h-9 shrink-0 items-center px-4 text-sm ${primaryButton}`
  const steps: Step[] = [
    {
      done: !!firstWishlistId,
      title: 'Create a wishlist',
      body: 'Pick the occasion and the date.',
      action: (
        <Link to="/dashboard/new" className={linkClass}>
          Create
        </Link>
      ),
    },
    {
      done: hasGift,
      title: 'Add your first gift',
      body: 'Paste a link from any shop, or add a cash fund.',
      action: firstWishlistId ? (
        <Link to="/dashboard/w/$id" params={{ id: firstWishlistId }} search={{ add: true }} className={linkClass}>
          Add a gift
        </Link>
      ) : null,
    },
    {
      done: hasBank,
      title: 'Add your bank account',
      body: 'Friends can only send money once you do. Gifts go straight to your account.',
      action: (
        <Link to="/dashboard/settings" hash="payouts" className={linkClass}>
          Add bank
        </Link>
      ),
    },
    {
      done: hasPhoto,
      title: 'Add a profile photo (optional)',
      body: 'Friends see it on your wishlists, so they know it’s really you.',
      action: (
        <Link to="/dashboard/settings" className={linkClass}>
          Add photo
        </Link>
      ),
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return null
  const next = steps.findIndex((s) => !s.done)

  return (
    <section className={`flex flex-col gap-4 rounded-3xl p-5 sm:p-6 ${glassCard}`} aria-labelledby="getting-started">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="getting-started" className="font-display text-3xl leading-none">
            Getting <span className="font-editorial text-4xl">started</span>
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {doneCount} of {steps.length} done. Finish these and your friends can start giving.
          </p>
        </div>
        <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200/80 sm:block dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-[width] duration-700"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-center gap-4 border-t border-neutral-200/70 py-3.5 first:border-t-0 dark:border-neutral-800">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs ${
                step.done
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : i === next
                    ? 'bg-purple-500/15 text-purple-700 ring-1 ring-purple-400/50 dark:text-purple-300'
                    : 'bg-neutral-900/5 text-neutral-500 dark:bg-white/10 dark:text-neutral-400'
              }`}
              aria-hidden="true"
            >
              {step.done ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] ${step.done ? 'text-neutral-400 line-through decoration-neutral-300 dark:text-neutral-500' : ''}`}>
                {step.title}
                <span className="sr-only">{step.done ? ' (done)' : ''}</span>
              </p>
              {!step.done && <p className="text-sm text-neutral-500 dark:text-neutral-400">{step.body}</p>}
            </div>
            {!step.done && step.action}
          </li>
        ))}
      </ol>
    </section>
  )
}

/** A clear stop sign on the owner's own pages while guests can't send money yet. */
export function BankNeededNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-400/10 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 ${
        compact ? 'p-4' : 'p-5'
      }`}
      role="status"
    >
      <div>
        <p className={compact ? 'text-[15px] font-medium' : 'font-display text-2xl'}>Friends can’t send money yet</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          The Contribute button stays hidden until you add the bank account gifts should go to. Reserving still works.
        </p>
      </div>
      <Link to="/dashboard/settings" hash="payouts" className={`inline-flex min-h-10 shrink-0 items-center self-start px-4 text-sm sm:self-auto ${primaryButton}`}>
        Add bank account
      </Link>
    </div>
  )
}
