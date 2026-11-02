import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { attempt } from '../errors'
import { followingList, matchContacts, peopleYouKnow, searchPeople, setFollow } from '../friends'
import { requireOwner, requireUser, saveFindability, toProfile } from '../users'

export const getFriendsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const viewer = await requireOwner()
  const [following, known] = await Promise.all([followingList(viewer), peopleYouKnow(viewer)])
  return { me: toProfile(viewer), following, known: known.filter((p) => !p.following) }
})

export const matchContactsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ hashes: z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(5000) }))
  .handler(({ data }) => attempt(async () => ({ people: await matchContacts(await requireOwner(), data.hashes) })))

export const searchPeopleFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ q: z.string().max(60) }))
  .handler(({ data }) => attempt(async () => ({ people: await searchPeople(await requireOwner(), data.q) })))

export const setFollowFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ handle: z.string().min(1).max(60), follow: z.boolean() }))
  .handler(({ data }) => attempt(async () => (await setFollow(await requireUser(), data.handle, data.follow), {})))

export const saveFindabilityFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      phone: z.string().max(30),
      discoverable: z.boolean(),
      instagram: z.string().max(120),
      tiktok: z.string().max(120),
      x: z.string().max(120),
      substack: z.string().max(120),
    }),
  )
  .handler(({ data }) => attempt(async () => (await saveFindability((await requireUser()).id, data), {})))
