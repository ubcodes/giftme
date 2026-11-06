import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { z } from 'zod'
import { isAdmin } from '../admin'
import { attempt, UserError } from '../errors'
import { requireUser } from '../users'
import { admitFromWaitlist, joinWaitlist, waitlistCount, waitlistForAdmin, waitlistStanding } from '../waitlist'

// A few joins a minute per address is plenty for a person and stops a script filling the list.
const recent = new Map<string, number[]>()
function tooMany(ip: string) {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000)
  hits.push(now)
  recent.set(ip, hits)
  if (recent.size > 5000) recent.clear()
  return hits.length > 5
}

export const getWaitlistCountFn = createServerFn({ method: 'GET' }).handler(async () => ({ count: await waitlistCount() }))

export const joinWaitlistFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      email: z.email().max(200),
      name: z.string().trim().max(80).optional(),
      ref: z.string().trim().max(20).optional(),
      // Hidden from people; bots that fill every field land here.
      website: z.string().max(200).optional(),
    }),
  )
  .handler(({ data }) =>
    attempt(async () => {
      if (data.website) throw new UserError('Something went wrong. Please try again.')
      if (tooMany(getRequestIP({ xForwardedFor: true }) ?? 'unknown')) throw new UserError('Too many tries. Please wait a minute.')
      return { standing: await joinWaitlist(data) }
    }),
  )

export const getWaitlistStandingFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ code: z.string().trim().max(20) }))
  .handler(async ({ data }) => ({ standing: await waitlistStanding(data.code) }))

async function requireAdmin() {
  const row = await requireUser()
  if (!isAdmin(row)) throw new UserError('Not found.')
}

export const getWaitlistAdminFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return { people: await waitlistForAdmin() }
})

export const admitFromWaitlistFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.email() }))
  .handler(({ data }) =>
    attempt(async () => {
      await requireAdmin()
      await admitFromWaitlist(data.email)
      return {}
    }),
  )
