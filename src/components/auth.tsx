import { ClerkProvider, SignIn, useClerk } from '@clerk/tanstack-react-start'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { devSignInFn, devSignOutFn } from '@/server/fns/account'
import { inputClass, primaryButton } from '@/lib/ui'
import { ErrorText, Field } from './ui'

// Client half of the auth module (server half: src/server/auth.ts).

type Mode = 'clerk' | 'dev' | 'off'

const appearance = {
  variables: {
    colorPrimary: '#a855f7',
    fontFamily: "'Belleza', system-ui, sans-serif",
    borderRadius: '0.9rem',
  },
  elements: {
    card: 'shadow-none bg-transparent',
    headerTitle: 'font-display text-3xl font-normal',
  },
}

export function AuthProvider({
  mode,
  publishableKey,
  children,
}: {
  mode: Mode
  publishableKey: string | null
  children: React.ReactNode
}) {
  if (mode !== 'clerk' || !publishableKey) return <>{children}</>
  return (
    <ClerkProvider publishableKey={publishableKey} appearance={appearance} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  )
}

export function SignInPanel({ mode, redirectTo }: { mode: Mode; redirectTo: string }) {
  if (mode === 'clerk') {
    return (
      <SignIn
        routing="hash"
        withSignUp
        forceRedirectUrl={redirectTo}
        signUpForceRedirectUrl={redirectTo}
        appearance={appearance}
      />
    )
  }
  if (mode === 'dev') return <DevSignIn redirectTo={redirectTo} />
  return <p className="text-sm text-neutral-500">Sign-in isn't set up on this server yet.</p>
}

function DevSignIn({ redirectTo }: { redirectTo: string }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    const res = await devSignInFn({ data: { name: String(form.get('name')), email: String(form.get('email')) } }).catch(() => ({
      ok: false as const,
      error: 'Please check the details.',
    }))
    if (res.ok) {
      window.location.href = redirectTo
      return
    }
    setBusy(false)
    setError(res.error)
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4">
      <p className="rounded-xl border border-amber-300/60 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Local test sign-in. Add Clerk keys to <code>.env</code> to turn on Google and email sign-in.
      </p>
      <Field label="Your name">
        <input name="name" required className={inputClass} autoComplete="name" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required className={inputClass} autoComplete="email" />
      </Field>
      <ErrorText>{error}</ErrorText>
      <button type="submit" disabled={busy} className={`min-h-12 text-[15px] ${primaryButton}`}>
        {busy ? 'Signing in…' : 'Continue'}
      </button>
    </form>
  )
}

export function useSignOut(mode: Mode) {
  const router = useRouter()
  if (mode === 'clerk') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const clerk = useClerk()
    return () => clerk.signOut({ redirectUrl: '/' })
  }
  return async () => {
    await devSignOutFn()
    await router.navigate({ to: '/' })
    router.invalidate()
  }
}
