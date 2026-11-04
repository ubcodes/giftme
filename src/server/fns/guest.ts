import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { attempt } from '../errors'
import { MIN_CONTRIBUTION_NGN, giftReceipt, publicProfile, publicWishlist, reserveItem, settleContribution, siteUrl, startContribution } from '../gifts'
import { isFollowing } from '../friends'
import { verifyPayment } from '../paystack'
import { viewerRow } from '../users'

export const getPublicWishlistFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ handle: z.string().max(60), slug: z.string().max(80) }))
  .handler(async ({ data }) => {
    const list = await publicWishlist(data.handle, data.slug)
    return list ? { found: true as const, minContribution: MIN_CONTRIBUTION_NGN, siteUrl: siteUrl(), ...list } : { found: false as const }
  })

export const getPublicProfileFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ handle: z.string().max(60) }))
  .handler(async ({ data }) => {
    const profile = await publicProfile(data.handle)
    if (!profile) return { found: false as const }
    const { ownerId, ...rest } = profile
    const viewer = await viewerRow().catch(() => null)
    // Signed-in visitors can follow, so this person's celebrations show on their Friends page.
    const follow = viewer?.handle && viewer.id !== ownerId ? { following: await isFollowing(viewer.id, data.handle) } : null
    return { found: true as const, siteUrl: siteUrl(), follow, ...rest }
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
      return { status, receipt: status === 'success' ? await giftReceipt(data.reference) : null }
    } catch (err) {
      console.error(err)
      return { status: 'unknown', receipt: null }
    }
  })
