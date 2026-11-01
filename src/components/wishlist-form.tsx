import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { OCCASIONS, occasion as findOccasion, type OccasionId } from '@/lib/occasions'
import { inputClass, primaryButton } from '@/lib/ui'
import { setAvatarFn } from '@/server/fns/account'
import { Avatar, ErrorText, Field } from './ui'
import { UploadButton } from './upload'

export type WishlistValues = {
  occasion: OccasionId
  title: string
  eventDate: string | null
  intro: string | null
  coverUrl: string | null
}

export function WishlistForm({
  initial,
  owner,
  submitLabel,
  onSubmit,
}: {
  initial?: WishlistValues
  owner: { displayName: string; avatarUrl: string | null }
  submitLabel: string
  onSubmit: (values: WishlistValues) => Promise<string | null>
}) {
  const [occasion, setOccasion] = useState<OccasionId>(initial?.occasion ?? 'birthday')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [titleTouched, setTitleTouched] = useState(!!initial)
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? '')
  const [intro, setIntro] = useState(initial?.intro ?? '')
  const [cover, setCover] = useState(initial?.coverUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [avatar, setAvatar] = useState(owner.avatarUrl)
  const router = useRouter()
  const ownerFirstName = owner.displayName.split(' ')[0]

  async function changeAvatar(url: string) {
    setAvatar(url)
    await setAvatarFn({ data: { avatarUrl: url } }).catch(() => null)
    void router.invalidate()
  }

  function pickOccasion(id: OccasionId) {
    setOccasion(id)
    // Suggest a title until the person writes their own.
    if (!titleTouched) setTitle(suggestTitle(id, ownerFirstName))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await onSubmit({
      occasion,
      title: title.trim() || suggestTitle(occasion, ownerFirstName),
      eventDate: eventDate || null,
      intro: intro.trim() || null,
      coverUrl: cover,
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800">
        <Avatar src={avatar} name={owner.displayName} size={56} />
        <div className="flex flex-1 flex-col gap-0.5 text-sm">
          <span>Your photo</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Shown at the top of your wishlist so guests know it's you.</span>
        </div>
        <UploadButton folder="avatars" onUploaded={changeAvatar} label={avatar ? 'Change' : 'Add photo'} />
      </div>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm">What's the occasion?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OCCASIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pickOccasion(o.id)}
              aria-pressed={occasion === o.id}
              className={`min-h-12 cursor-pointer rounded-xl border px-3 text-left text-sm transition-colors ${
                occasion === o.id
                  ? 'border-purple-400/70 bg-purple-500/15 text-purple-800 dark:border-purple-500/60 dark:text-purple-200'
                  : 'border-neutral-300/70 hover:bg-neutral-900/5 dark:border-neutral-700/70 dark:hover:bg-neutral-100/5'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Title">
        <input
          className={inputClass}
          value={title}
          placeholder={suggestTitle(occasion, ownerFirstName)}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleTouched(true)
          }}
          maxLength={120}
        />
      </Field>
      <Field label="Date" hint="optional, shows a countdown">
        <input type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </Field>
      <Field label="A note for your guests" hint="optional">
        <textarea
          className={inputClass}
          rows={3}
          value={intro}
          maxLength={1000}
          placeholder="Thank you for celebrating with me. Contribute toward anything here, or reserve something to buy yourself."
          onChange={(e) => setIntro(e.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-2 text-sm">
        <span>
          Banner photo <span className="text-neutral-500 dark:text-neutral-400">· optional</span>
        </span>
        <span className="-mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          A wide picture across the top of your page, like a couple's photo for a wedding. Skip it if you like.
        </span>
        {cover && <img src={cover} alt="" className="aspect-[16/5] w-full rounded-xl object-cover" />}
        <div className="flex items-center gap-2">
          <UploadButton folder="covers" onUploaded={setCover} label={cover ? 'Change banner' : 'Add a banner'} />
          {cover && (
            <button type="button" onClick={() => setCover(null)} className="cursor-pointer text-sm text-neutral-500 underline underline-offset-4">
              Remove
            </button>
          )}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <button type="submit" disabled={busy} className={`min-h-12 text-[15px] ${primaryButton}`}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

function suggestTitle(id: OccasionId, name: string) {
  const year = new Date().getFullYear()
  switch (id) {
    case 'birthday':
      return `${name}'s birthday wishlist`
    case 'wedding':
      return `${name}'s wedding registry`
    case 'baby':
      return `${name}'s baby shower`
    case 'graduation':
      return `${name}'s graduation ${year}`
    case 'housewarming':
      return `${name}'s new home`
    case 'anniversary':
      return `${name}'s anniversary`
    default:
      return `${name}'s ${findOccasion(id).label.toLowerCase()} wishlist`
  }
}
