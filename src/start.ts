import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createStart } from '@tanstack/react-start'

// Clerk only runs once its keys are set; until then the app uses the local dev sign-in
// (see src/server/auth.ts).
const clerkEnabled =
  typeof process !== 'undefined' &&
  !!process.env.CLERK_SECRET_KEY &&
  !!(process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY)

export const startInstance = createStart(() => ({
  requestMiddleware: clerkEnabled ? [clerkMiddleware()] : [],
}))
