import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMode, clerkPublishableKey, endDevSession, startDevSession } from '../auth'
import { run } from '../db'
import { isAdmin } from '../admin'
import { attempt, UserError } from '../errors'
import { siteUrl } from '../gifts'
import { canCreateProfile, prelaunch } from '../waitlist'
import { handleAvailable, normalizeHandle, requireUser, saveProfile, suggestHandle, toProfile, viewerRow } from '../users'

export const getViewerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const mode = authMode()
  const row = mode === 'off' ? null : await viewerRow()
  return {
    mode,
    publishableKey: mode === 'clerk' ? clerkPublishableKey() : null,
    user: row ? toProfile(row) : null,
    isAdmin: isAdmin(row),
    siteUrl: siteUrl(),
    prelaunch: prelaunch(),
    // While pre-launch is on, only people let in from the waitlist can finish signing up.
    canJoin: await canCreateProfile(row, isAdmin(row)),
  }
})

export const devSignInFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ name: z.string().trim().min(1).max(80), email: z.email() }))
  .handler(({ data }) =>
    attempt(async () => {
      const id = startDevSession(data.email)
      await run(`INSERT OR IGNORE INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)`, [
        id,
        data.email.toLowerCase(),
        data.name,
        Date.now(),
      ])
      return {}
    }),
  )

export const devSignOutFn = createServerFn({ method: 'POST' }).handler(async () => {
  if (authMode() === 'dev') endDevSession()
  return { ok: true }
})

export const suggestHandleFn = createServerFn({ method: 'GET' }).handler(async () => {
  const row = await requireUser()
  return { handle: row.handle ?? (await suggestHandle(row.display_name, row.id)) }
})

export const checkHandleFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ handle: z.string().max(60) }))
  .handler(async ({ data }) => {
    const row = await requireUser()
    const handle = normalizeHandle(data.handle)
    return { handle, available: await handleAvailable(handle, row.id) }
  })

export const saveProfileFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      displayName: z.string().trim().min(1).max(60),
      handle: z.string().trim().min(1).max(60),
      avatarUrl: z.string().max(2000).nullable(),
    }),
  )
  .handler(({ data }) =>
    attempt(async () => {
      const row = await requireUser()
      if (!(await canCreateProfile(row, isAdmin(row)))) throw new UserError("GiftMe isn't open yet. You're on the waitlist, and we'll email you when it's your turn.")
      await saveProfile(row.id, data)
      return {}
    }),
  )

export const setAvatarFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ avatarUrl: z.string().max(2000).nullable() }))
  .handler(({ data }) =>
    attempt(async () => {
      const row = await requireUser()
      await run('UPDATE users SET avatar_url = ? WHERE id = ?', [data.avatarUrl, row.id])
      return {}
    }),
  )
