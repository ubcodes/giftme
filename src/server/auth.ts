import { createHmac, timingSafeEqual } from 'node:crypto'
import { auth as clerkAuth, clerkClient } from '@clerk/tanstack-react-start/server'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

// Everything about "who is signed in" lives here, so swapping Clerk for another provider
// only touches this file and src/components/auth.tsx.
//
// Modes:
//  - clerk: CLERK_SECRET_KEY + CLERK_PUBLISHABLE_KEY are set (Google + email codes, hosted UI).
//  - dev:   no Clerk keys and not production. A local test sign-in so the app can be tried
//           before Clerk is set up. Never available in production.
//  - off:   production without Clerk keys; nobody can sign in.

export type AuthMode = 'clerk' | 'dev' | 'off'

export function clerkPublishableKey() {
  return process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || ''
}

export function authMode(): AuthMode {
  if (process.env.CLERK_SECRET_KEY && clerkPublishableKey()) return 'clerk'
  if (process.env.NODE_ENV !== 'production') return 'dev'
  return 'off'
}

/** Basic details from the sign-in provider, used to prefill a new profile. */
export type AuthIdentity = {
  userId: string
  email: string | null
  name: string | null
  imageUrl: string | null
}

export async function currentUserId(): Promise<string | null> {
  const mode = authMode()
  if (mode === 'clerk') {
    const { userId } = await clerkAuth()
    return userId ?? null
  }
  if (mode === 'dev') return readDevSession()
  return null
}

export async function identityFor(userId: string): Promise<AuthIdentity> {
  if (authMode() === 'clerk') {
    const user = await clerkClient().users.getUser(userId)
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
    return {
      userId,
      email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null,
      name,
      imageUrl: user.hasImage ? user.imageUrl : null,
    }
  }
  return { userId, email: null, name: null, imageUrl: null }
}

// --- Dev mode --------------------------------------------------------------------------

const DEV_COOKIE = 'gm_dev_session'

function devSign(value: string) {
  const secret = process.env.DEV_AUTH_SECRET || 'giftme-local-dev'
  return createHmac('sha256', secret).update(value).digest('hex')
}

function readDevSession() {
  const raw = getCookie(DEV_COOKIE)
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  const id = raw.slice(0, dot)
  const sig = Buffer.from(raw.slice(dot + 1))
  const expected = Buffer.from(devSign(id))
  return sig.length === expected.length && timingSafeEqual(sig, expected) ? id : null
}

/** Dev mode only: sign in as a local test user identified by email. */
export function startDevSession(email: string) {
  if (authMode() !== 'dev') throw new Error('Dev sign-in is disabled')
  const id = `dev_${createHmac('sha256', 'giftme-dev-id').update(email.toLowerCase()).digest('hex').slice(0, 16)}`
  setCookie(DEV_COOKIE, `${id}.${devSign(id)}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  return id
}

export function endDevSession() {
  deleteCookie(DEV_COOKIE, { path: '/' })
}
