/** Slow-drifting colour behind the top of the landing and waitlist pages. */
export function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] overflow-hidden">
      <div className="drift-a absolute -top-40 left-[8%] h-[480px] w-[560px] rounded-full bg-purple-400/30 blur-3xl dark:bg-purple-600/20" />
      <div className="drift-b absolute -top-24 right-[4%] h-[420px] w-[520px] rounded-full bg-pink-400/25 blur-3xl dark:bg-pink-600/15" />
      <div className="drift-c absolute top-64 left-1/3 h-[380px] w-[620px] rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/15" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.06)_1px,transparent_0)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.06)_1px,transparent_0)]" />
    </div>
  )
}
