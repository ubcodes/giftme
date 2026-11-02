import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Glow } from '@/components/ui'
import { primaryButton } from '@/lib/ui'
import { confirmPaymentFn } from '@/server/fns/guest'

export const Route = createFileRoute('/thank-you')({
  validateSearch: z.object({ reference: z.string().optional(), trxref: z.string().optional(), w: z.string().optional() }),
  head: () => ({ meta: [{ title: 'Thank you · GiftMe' }] }),
  component: ThankYou,
})

function ThankYou() {
  const { reference, trxref, w } = Route.useSearch()
  const ref = reference ?? trxref
  const [status, setStatus] = useState<string>(ref ? 'checking' : 'unknown')
  const back = w && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(w) ? `/w/${w}` : '/'

  useEffect(() => {
    if (!ref) return
    let cancelled = false
    let tries = 0
    // Bank transfers can take a minute to land, so keep checking for a little while.
    const check = async () => {
      const res = await confirmPaymentFn({ data: { reference: ref } })
      if (cancelled) return
      if (res.status === 'pending' && tries++ < 12) {
        setStatus('pending')
        setTimeout(check, 5000)
      } else {
        setStatus(res.status)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [ref])

  const copy: Record<string, { title: string; body: string }> = {
    checking: { title: 'One moment…', body: 'Confirming your payment.' },
    pending: { title: 'Almost there', body: "Your payment is still on its way. You can close this page; it'll show up once it lands." },
    success: { title: 'Thank you', body: 'Your gift is in. It means a lot, truly.' },
    failed: { title: "That didn't go through", body: 'No money was taken for this attempt. You can try again from the list.' },
  }
  const { title, body } = copy[status] ?? { title: 'Thank you', body: "If your payment went through, it'll show on the list shortly." }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className={status === 'success' ? 'font-editorial text-7xl' : 'font-display text-5xl'}>{title}</h1>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
        <a href={back} className="mt-4 text-sm underline underline-offset-4">
          Back to the wishlist
        </a>
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Have a birthday, wedding or big day coming up?</p>
          <Link to="/" className={`inline-flex min-h-11 items-center px-5 text-[15px] ${primaryButton}`}>
            Make your own wishlist →
          </Link>
        </div>
      </main>
    </div>
  )
}
