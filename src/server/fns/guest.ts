import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { attempt } from '../errors'
import { MIN_CONTRIBUTION_NGN, publicProfile, publicWishlist, reserveItem, settleContribution, startContribution } from '../gifts'
import { verifyPayment } from '../paystack'

export const getPublicWishlistFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ handle: z.string().max(60), slug: z.string().max(80) }))
  .handler(async ({ data }) => {
    const list = await publicWishlist(data.handle, data.slug)
    return list ? { found: true as const, minContribution: MIN_CONTRIBUTION_NGN, ...list } : { found: false as const }
  })

export const getPublicProfileFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ handle: z.string().max(60) }))
  .handler(async ({ data }) => {
    const profile = await publicProfile(data.handle)
    return profile ? { found: true as const, ...profile } : { found: false as const }
  })

export const contributeFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      amountNgn: z.number().int().positive(),
      name: z.string().trim().max(80).optional(),
      email: z.email(),
      message: z.string().trim().max(500).optional(),
    }),
  )
  .handler(({ data }) => attempt(() => startContribution(data)))

export const reserveFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      name: z.string().trim().min(1).max(80),
      email: z.email().optional().or(z.literal('')),
      note: z.string().trim().max(300).optional(),
    }),
  )
  .handler(({ data }) => attempt(async () => (await reserveItem(data), {})))

/** The thank-you page checks with Paystack directly, in case the webhook is slow. */
export const confirmPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ reference: z.string().min(1).max(100) }))
  .handler(async ({ data }) => {
    try {
      const payment = await verifyPayment(data.reference)
      const status = await settleContribution(data.reference, payment.status, payment.amount)
      return { status }
    } catch (err) {
      console.error(err)
      return { status: 'unknown' }
    }
  })
