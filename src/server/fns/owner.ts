import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { attempt } from '../errors'
import {
  addOfflineGift,
  bankList,
  cancelReservation,
  lookupAccount,
  ownerOverview,
  ownerWishlistDetail,
  platformFeePercent,
  reconcileSplits,
  savePayoutAccount,
  sendThankYou,
  siteUrl,
} from '../gifts'
import { previewLink, usdRate } from '../products'
import { resolveShopLink, searchProvider } from '../search'
import { requireOwner, toProfile } from '../users'
import {
  addItem,
  createWishlist,
  deleteItem,
  deleteWishlist,
  reorderItems,
  setItemFlags,
  updateItem,
  updateWishlist,
} from '../wishlists'
import { OCCASION_IDS } from '@/lib/occasions'

// Everything a signed-in owner can do. Each handler checks ownership in the server layer.

const wishlistInput = z.object({
  occasion: z.enum(OCCASION_IDS),
  title: z.string().trim().min(1).max(120),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  intro: z.string().trim().max(1000).nullable(),
  coverUrl: z.string().max(2000).nullable(),
})

const itemInput = z.object({
  kind: z.enum(['gift', 'fund']),
  title: z.string().trim().min(1).max(200),
  priceNgn: z.number().int().positive().nullable(),
  priceUsd: z.number().positive().nullable(),
  imageUrl: z.string().max(3_000_000).nullable(),
  link: z.url().max(2000).nullable(),
  note: z.string().trim().max(500).nullable(),
  allowReserve: z.boolean(),
  allowMoney: z.boolean(),
})

export const getDashboardFn = createServerFn({ method: 'GET' }).handler(async () => {
  const owner = await requireOwner()
  await reconcileSplits(owner.id)
  return {
    user: toProfile(owner),
    wishlists: await ownerOverview(owner.id),
  }
})

export const getOwnerWishlistFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const owner = await requireOwner()
    return {
      user: toProfile(owner),
      siteUrl: siteUrl(),
      searchEnabled: !!searchProvider(),
      usdRate: usdRate(),
      ...(await ownerWishlistDetail(owner.id, data.id)),
    }
  })

export const createWishlistFn = createServerFn({ method: 'POST' })
  .inputValidator(wishlistInput)
  .handler(({ data }) => attempt(async () => createWishlist((await requireOwner()).id, data)))

export const updateWishlistFn = createServerFn({ method: 'POST' })
  .inputValidator(wishlistInput.extend({ id: z.string(), slug: z.string().trim().max(60).optional() }))
  .handler(({ data }) =>
    attempt(async () => {
      const { id, ...input } = data
      await updateWishlist((await requireOwner()).id, id, input)
      return {}
    }),
  )

export const deleteWishlistFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(({ data }) => attempt(async () => (await deleteWishlist((await requireOwner()).id, data.id), {})))

export const addItemFn = createServerFn({ method: 'POST' })
  .inputValidator(itemInput.extend({ wishlistId: z.string() }))
  .handler(({ data }) =>
    attempt(async () => {
      const { wishlistId, ...input } = data
      return addItem((await requireOwner()).id, wishlistId, input)
    }),
  )

export const updateItemFn = createServerFn({ method: 'POST' })
  .inputValidator(itemInput.extend({ id: z.string() }))
  .handler(({ data }) =>
    attempt(async () => {
      const { id, ...input } = data
      await updateItem((await requireOwner()).id, id, input)
      return {}
    }),
  )

export const setItemFlagsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), hidden: z.boolean().optional(), received: z.boolean().optional(), mostWanted: z.boolean().optional() }))
  .handler(({ data }) =>
    attempt(async () => {
      const { id, ...flags } = data
      await setItemFlags((await requireOwner()).id, id, flags)
      return {}
    }),
  )

export const deleteItemFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(({ data }) => attempt(async () => (await deleteItem((await requireOwner()).id, data.id), {})))

export const reorderItemsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ wishlistId: z.string(), ids: z.array(z.string()).max(500) }))
  .handler(({ data }) => attempt(async () => (await reorderItems((await requireOwner()).id, data.wishlistId, data.ids), {})))

export const previewLinkFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ url: z.string().trim().min(4).max(2000) }))
  .handler(({ data }) =>
    attempt(async () => {
      await requireOwner()
      return { draft: await previewLink(data.url) }
    }),
  )

export const searchProductsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ query: z.string().trim().min(2).max(120) }))
  .handler(({ data }) =>
    attempt(async () => {
      await requireOwner()
      const provider = searchProvider()
      return { results: provider ? await provider.search(data.query) : [] }
    }),
  )

export const resolveShopLinkFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string().min(1).max(2000), source: z.string().max(200).nullable() }))
  .handler(({ data }) =>
    attempt(async () => {
      await requireOwner()
      return { link: await resolveShopLink(data.token, data.source).catch(() => null) }
    }),
  )

export const addOfflineGiftFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemId: z.string(),
      amountNgn: z.number().positive().max(100_000_000),
      name: z.string().trim().max(80).optional(),
      note: z.string().trim().max(300).optional(),
    }),
  )
  .handler(({ data }) => attempt(async () => (await addOfflineGift((await requireOwner()).id, data), {})))

export const cancelReservationFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ itemId: z.string() }))
  .handler(({ data }) => attempt(async () => (await cancelReservation((await requireOwner()).id, data.itemId), {})))

export const sendThankYouFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ reference: z.string(), note: z.string().trim().min(1).max(2000) }))
  .handler(({ data }) => attempt(async () => (await sendThankYou((await requireOwner()).id, data.reference, data.note), {})))

// --- Payout account --------------------------------------------------------------------

export const getPayoutSetupFn = createServerFn({ method: 'GET' }).handler(async () => {
  const owner = await requireOwner()
  const banks = await bankList().catch(() => [])
  return { user: toProfile(owner), banks, feePercent: platformFeePercent() }
})

export const lookupAccountFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ accountNumber: z.string().regex(/^\d{10}$/), bankCode: z.string().min(1).max(20) }))
  .handler(({ data }) =>
    attempt(async () => {
      await requireOwner()
      return lookupAccount(data.accountNumber, data.bankCode)
    }),
  )

export const savePayoutAccountFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ accountNumber: z.string().regex(/^\d{10}$/), bankCode: z.string().min(1).max(20) }))
  .handler(({ data }) =>
    attempt(async () => {
      const owner = await requireOwner()
      return { user: await savePayoutAccount(owner.id, data) }
    }),
  )
