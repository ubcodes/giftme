import { useEffect, useState } from 'react'
import { checkHandleFn, saveProfileFn } from '@/server/fns/account'
import type { Profile } from '@/server/users'
import { inputClass, primaryButton } from '@/lib/ui'
import { Avatar, ErrorText, Field } from './ui'
import { UploadButton } from './upload'

export function ProfileForm({
  user,
  initialHandle,
  submitLabel,
  onSaved,
}: {
  user: Profile
  initialHandle: string
  submitLabel: string
  onSaved: () => void
}) {
  const [name, setName] = useState(user.displayName)
  const [handle, setHandle] = useState(initialHandle)
  const [avatar, setAvatar] = useState(user.avatarUrl)
  const [handleState, setHandleState] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!handle) return setHandleState('idle')
    setHandleState('checking')
    const t = setTimeout(async () => {
      const res = await checkHandleFn({ data: { handle } }).catch(() => null)
      if (res) setHandleState(res.available ? 'ok' : 'taken')
    }, 350)
    return () => clearTimeout(t)
  }, [handle])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveProfileFn({ data: { displayName: name, handle, avatarUrl: avatar } }).catch(() => ({
      ok: false as const,
      error: 'Please check the details and try again.',
    }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar src={avatar} name={name || 'You'} size={72} />
        <div className="flex flex-col items-start gap-1.5">
          <UploadButton folder="avatars" onUploaded={setAvatar} label={avatar ? 'Change photo' : 'Add a photo'} />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Friends see this on your wishlists.</span>
        </div>
      </div>
      <Field label="Your name" hint="as friends know you">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
      </Field>
      <Field label="Your link">
        <div className="flex items-center rounded-lg border border-neutral-300/70 focus-within:border-transparent focus-within:ring-1 focus-within:ring-purple-500/70 dark:border-neutral-700/70">
          <span className="pl-3.5 text-[15px] whitespace-nowrap text-neutral-400">giftme/w/</span>
          <input
            className="w-full min-w-0 bg-transparent py-2.5 pr-3.5 text-[15px] outline-none"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            minLength={3}
            maxLength={30}
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {handleState === 'checking' && 'Checking…'}
          {handleState === 'ok' && <span className="text-emerald-700 dark:text-emerald-400">Available</span>}
          {handleState === 'taken' && <span className="text-red-700 dark:text-red-400">Taken or not allowed, try another</span>}
          {handleState === 'idle' && 'Letters, numbers and dashes'}
        </span>
      </Field>
      <ErrorText>{error}</ErrorText>
      <button type="submit" disabled={busy || handleState === 'taken'} className={`min-h-12 text-[15px] ${primaryButton}`}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
