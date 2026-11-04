import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { GiftScene, preloadGiftScene } from '@/components/lazy-gift-scene'
import { Glow } from '@/components/ui'
import { naira } from '@/lib/format'
import { primaryButton } from '@/lib/ui'
import { confirmPaymentFn } from '@/server/fns/guest'

export const Route = createFileRoute('/thank-you')({
  validateSearch: z.object({ reference: z.string().optional(), trxref: z.string().optional(), w: z.string().optional() }),
  head: () => ({ meta: [{ title: 'Thank you · GiftMe' }] }),
  component: ThankYou,
})

type Receipt = { amountNgn: number; item: string; ownerFirstName: string }

function ThankYou() {
  const { reference, trxref, w } = Route.useSearch()
  const ref = reference ?? trxref
  const [status, setStatus] = useState<string>(ref ? 'checking' : 'unknown')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [scene, setScene] = useState<{ still: boolean } | null>(null)
  const closed = useRef(0)
  const back = w && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(w) ? `/w/${w}` : '/'

  useEffect(() => {
    // Start fetching the 3D box while the payment is confirmed, so it's ready to drop in.
    const probe = document.createElement('canvas')
    if (probe.getContext('webgl2') || probe.getContext('webgl')) {
      void preloadGiftScene()
      setScene({ still: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    }
  }, [])

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
        setReceipt(res.receipt)
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
    success: {
      title: 'Thank you',
      body: `Your gift is on its way to ${receipt?.ownerFirstName ?? 'them'}. It reaches their bank the next business day.`,
    },
    failed: { title: "That didn't go through", body: 'No money was taken for this attempt. You can try again from the list.' },
  }
  const { title, body } = copy[status] ?? { title: 'Thank you', body: "If your payment went through, it'll show on the list shortly." }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
        {/* The space is kept from the start so the text doesn't jump when the box drops in. */}
        {scene && status !== 'failed' && (
          <div aria-hidden="true" className="-mb-4 h-56 w-full sm:h-64">
            {status === 'success' && (
              <GiftScene progress={closed} still={scene.still} active compact layout="thanks" />
            )}
          </div>
        )}
        <h1 className={status === 'success' ? 'font-editorial text-7xl' : 'font-display text-5xl'}>{title}</h1>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
        {status === 'success' && receipt && (
          <p className="rounded-full bg-purple-500/10 px-5 py-2 text-sm text-purple-800 dark:bg-purple-400/15 dark:text-purple-200">
            {naira(receipt.amountNgn)} · {receipt.item}
          </p>
        )}
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
