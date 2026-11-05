// Quiet pills: a soft purple fill for the main action and a hairline outline for the
// secondary one, each with a faint glass highlight on the top edge. Bigger glass effects
// are kept for floating surfaces (see .liquid in styles.css).
export const primaryButton =
  'cursor-pointer rounded-full border border-purple-300/60 bg-purple-500/15 text-purple-800 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] transition-colors duration-200 hover:bg-purple-500/25 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:outline-none disabled:cursor-default disabled:opacity-50 dark:border-purple-500/40 dark:text-purple-200 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]'

export const secondaryButton =
  'cursor-pointer rounded-full border border-neutral-300/70 bg-white/40 text-neutral-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] backdrop-blur-sm transition-colors duration-200 hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:outline-none dark:border-neutral-700/70 dark:bg-white/[0.03] dark:text-neutral-300 dark:shadow-none dark:hover:bg-white/[0.07]'

// Liquid glass versions for the landing page's hero and nav, matching the theme toggle.
export const glassPrimary =
  'liquid liquid-tint liquid-press cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:outline-none'

export const glassSecondary =
  'liquid liquid-press cursor-pointer rounded-full text-neutral-700 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:outline-none dark:text-neutral-200'

export const inputClass =
  'w-full rounded-lg border border-neutral-300/70 bg-transparent px-3.5 py-2.5 text-[15px] outline-none placeholder:text-neutral-400 focus:border-transparent focus:ring-1 focus:ring-purple-500/70 dark:border-neutral-700/70'
