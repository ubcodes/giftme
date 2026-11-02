// The film's clock, shared by the film (browser) and the audio scripts (node).
// Scenes are listed in order with their own length; everything inside a scene is in local
// seconds, so adding a beat (say, "find friends") is one more entry here and one draw function.

export const BPM = 120
export const BEAT = 60 / BPM
export const W = 1920
export const H = 1080

// vo: which voice line plays and when, in the scene's own seconds.
// cues: sound effects at local times. Types are the voices in the kit's sfx.mjs.
export const SCENES = [
  {
    id: 'drop',
    dur: 4.5,
    vo: { line: 1, at: 0.75 },
    cues: [
      [0.0, 'swoosh', 0.5], [0.5, 'impact', 0.9], [0.5, 'kick', 0.7],
      [1.0, 'pop', 0.8], [1.07, 'bubble', 0.5], [1.14, 'pop', 0.6], [1.21, 'bubble', 0.5],
      [2.06, 'pop', 0.7], [2.13, 'bubble', 0.5], [2.2, 'pop', 0.6],
      [3.25, 'pop', 0.7], [3.32, 'bubble', 0.5], [3.39, 'pop', 0.6], [3.46, 'bubble', 0.4],
      [1.9, 'thump', 0.35], [2.35, 'thump', 0.3], [3.0, 'thump', 0.3], [3.9, 'thump', 0.3],
      [4.15, 'whoosh', 0.7],
    ],
  },
  {
    id: 'chaos',
    dur: 4.0,
    vo: { line: 2, at: 0.15 },
    cues: [
      [0.0, 'notify', 0.55], [0.25, 'pop', 0.5], [0.5, 'notify', 0.45], [0.75, 'pop', 0.5],
      [1.0, 'notify', 0.45], [1.25, 'pop', 0.5], [1.5, 'notify', 0.4], [1.75, 'pop', 0.45],
      [2.2, 'swoosh', 0.4], [2.9, 'tick', 0.6], [3.35, 'kick', 0.5],
      [3.55, 'riser', 0.6], [3.7, 'whoosh', 0.6],
    ],
  },
  {
    id: 'intro',
    dur: 2.0,
    vo: { line: 3, at: 0.4 },
    cues: [[0.45, 'tick', 0.5], [1.0, 'impact', 1.0], [1.0, 'sparkle', 0.6], [1.62, 'swoosh', 0.5]],
  },
  {
    id: 'add',
    dur: 6.5,
    vo: { line: 4, at: 0.4 },
    cues: [
      [0.3, 'pop', 0.3], [0.4, 'pop', 0.3], [0.5, 'pop', 0.3], [0.6, 'pop', 0.3],
      [1.0, 'click', 0.8], [1.05, 'swoosh', 0.35],
      ...keys(1.2, 2.0, 0.07),
      [2.05, 'tick', 0.4], [2.5, 'drop', 0.6], [2.55, 'thump', 0.4],
      [2.7, 'swoosh', 0.35],
      ...keys(2.85, 3.4, 0.07),
      [3.5, 'impact', 0.55], [3.5, 'pop', 0.7], [3.55, 'bubble', 0.5], [3.6, 'pop', 0.6], [3.65, 'bubble', 0.5],
      [3.7, 'pop', 0.55], [3.75, 'bubble', 0.45], [3.8, 'sparkle', 0.4],
      [5.0, 'click', 0.8], [5.15, 'swoosh', 0.4], [5.55, 'drop', 0.55],
      [6.15, 'whoosh', 0.45],
    ],
  },
  {
    id: 'share',
    dur: 3.0,
    vo: { line: 5, at: 0.4 },
    cues: [[0.55, 'click', 0.8], [0.65, 'success', 0.45], [0.95, 'swoosh', 0.5], [1.3, 'notify', 0.5], [1.9, 'pop', 0.5], [2.4, 'notify', 0.45]],
  },
  {
    id: 'give',
    dur: 5.0,
    vo: { line: 6, at: 0.25 },
    cues: [
      [0.0, 'tick', 0.5], [0.05, 'swoosh', 0.35], [0.7, 'click', 0.7], [0.8, 'swoosh', 0.3],
      [1.05, 'click', 0.6], [1.15, 'key', 0.4], [1.3, 'key', 0.4], [1.45, 'key', 0.4], [1.6, 'key', 0.4],
      [1.75, 'click', 0.8], [1.85, 'coin', 0.55], [1.9, 'drop', 0.5], [2.0, 'success', 0.5],
      [2.5, 'pop', 0.5], [2.75, 'pop', 0.5], [3.0, 'pop', 0.5], [3.25, 'pop', 0.5],
      [2.9, 'chime', 0.45], [4.6, 'whoosh', 0.45],
    ],
  },
  {
    id: 'bank',
    dur: 4.5,
    vo: { line: 7, at: 0.25 },
    cues: [
      [0.3, 'riser', 0.25], [1.6, 'coin', 0.6], [1.0, 'notify', 0.8],
      [2.2, 'swoosh', 0.4], [2.9, 'click', 0.8], [3.0, 'success', 0.5], [3.05, 'swoosh', 0.45],
      [4.2, 'whoosh', 0.5],
    ],
  },
  {
    id: 'end',
    dur: 5.5,
    vo: { line: 8, at: 0.25 },
    cues: [
      [0.1, 'thump', 0.4], [0.3, 'impact', 1.0], [0.3, 'sparkle', 0.5],
      [0.55, 'thump', 0.35], [0.8, 'thump', 0.35], [1.05, 'thump', 0.3], [1.3, 'thump', 0.3],
      [3.5, 'pop', 0.6], [4.3, 'click', 0.8], [4.4, 'sparkle', 0.55],
    ],
  },
]

function keys(from, to, step) {
  const out = []
  for (let t = from; t < to; t += step) out.push([t, 'key', 0.32])
  return out
}

// Absolute start of each scene.
let at = 0
for (const s of SCENES) {
  s.from = at
  s.to = at + s.dur
  at += s.dur
}
export const DUR = at

export const VO = SCENES.map((s) => ({ line: s.vo.line, at: s.from + s.vo.at }))

export const CUES = SCENES.flatMap((s) => s.cues.map(([t, type, gain]) => ({ t: +(s.from + t).toFixed(3), type, gain })))

export const scene = (id) => SCENES.find((s) => s.id === id)
