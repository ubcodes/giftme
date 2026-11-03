// Builds the film's audio stems from the timeline: an original afro-pop score, the sound
// effects, and the voice lines placed on their beats.
//   node film/audio.mjs   (from video/) → out/music.wav, out/sfx.wav, out/voice.wav
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { renderCues, writeWav, SR } from '/Users/ubokabasi/.claude/skills/motion-reel/kit/sfx.mjs'
import { BEAT, CUES, DUR, SCENES, VO } from './timeline.js'

mkdirSync('out', { recursive: true })
const N = Math.ceil(DUR * SR)
const L = new Float32Array(N), R = new Float32Array(N)
const TAU = Math.PI * 2
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12)
let seed = 7
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1)
const at = (id) => SCENES.find((s) => s.id === id).from
const len = (id) => SCENES.find((s) => s.id === id).dur

// Where the music plays and how hard.
const DROP = at('intro') + 2 * BEAT // the logo hit
function section(t) {
  if (t < at('chaos')) return { drums: 0.7, keys: 0.8, bass: 0.6, lp: 1 }
  if (t < at('intro')) return { drums: 0.75, keys: 0.6, bass: 0.6, lp: 0.25 + 0.75 * (1 - (t - at('chaos')) / len('chaos')) }
  if (t < DROP) return { drums: 0, keys: 0, bass: 0, lp: 1 }
  if (t < DUR - 1.5) return { drums: 1, keys: 1, bass: 1, lp: 1 }
  return { drums: 0, keys: 0, bass: 0, lp: 1 }
}

function add(buf, start, len, fn, gain = 1) {
  const s0 = Math.floor(start * SR)
  for (let i = 0; i < len * SR; i++) {
    const j = s0 + i; if (j < 0 || j >= N) continue
    buf[j] += fn(i / SR) * gain
  }
}
function both(start, len, fn, gain, pan = 0) {
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2
  add(L, start, len, fn, gain * gl); add(R, start, len, fn, gain * gr)
}

// Instruments ---------------------------------------------------------------------
const kick = (t) => Math.sin(TAU * (48 * t + (110 / 30) * (1 - Math.exp(-30 * t)))) * Math.exp(-t * 7) * 0.9
function clap() { const lp = { y: 0 }; return (t) => { const n = noise(); lp.y += 0.35 * (n - lp.y); const burst = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 90) : 0), 0) + Math.exp(-t * 18) * 0.6; return (n - lp.y) * burst * 0.35 } }
function shaker() { let px = 0, y = 0; return (t) => { const n = noise(); y = 0.8 * (y + n - px); px = n; return y * Math.exp(-t * 55) * 0.18 } }
const logDrum = (m) => (t) => { const f = hz(m) * (1 + 0.6 * Math.exp(-t * 28)); return Math.tanh(Math.sin(TAU * f * t) * 2.2) * Math.exp(-t * 5.5) * 0.42 }
const epiano = (m) => (t) => { const f = hz(m), idx = 1.8 * Math.exp(-t * 6) + 0.25; return (Math.sin(TAU * f * t + idx * Math.sin(TAU * f * t)) + 0.15 * Math.sin(TAU * f * 14 * t) * Math.exp(-t * 30)) * Math.exp(-t * 3.2) * 0.11 }
const marimba = (m) => (t) => (Math.sin(TAU * hz(m) * t) + 0.35 * Math.sin(TAU * hz(m) * 3.9 * t) * Math.exp(-t * 25)) * Math.exp(-t * 7) * 0.16
const tom = (m) => (t) => Math.sin(TAU * hz(m) * (1 + 0.4 * Math.exp(-t * 20)) * t) * Math.exp(-t * 9) * 0.35

const CHORDS = [[50, 53, 57, 60], [50, 53, 57, 58], [53, 57, 60, 64], [52, 55, 60, 62]] // Dm7 Bbmaj7/D Fmaj7 Cadd9
const ROOTS = [38, 34, 41, 36]
const MOTIF = [74, 77, 81, 79, 77, 74, 72, 74] // D5 F5 A5 G5 F5 D5 C5 D5

const bar = 4 * BEAT, s16 = BEAT / 4, swing = 0.035
const keysBus = [new Float32Array(N), new Float32Array(N)]
for (let b = 0; b * bar < DUR; b++) {
  const t0 = b * bar, chord = CHORDS[b % 4], root = ROOTS[b % 4]
  for (let k = 0; k < 16; k++) {
    const t = t0 + k * s16 + (k % 2 ? swing : 0), sec = section(t)
    if (sec.drums) {
      if ([0, 7, 8, 11].includes(k)) both(t, 0.5, kick, sec.drums * (k === 0 ? 1 : 0.75))
      if (k === 4 || k === 12) both(t, 0.3, clap(), sec.drums * sec.lp, 0.1)
      both(t, 0.08, shaker(), sec.drums * sec.lp * (k % 4 === 2 ? 1 : 0.55), -0.35)
    }
    if (sec.bass && [0, 3, 6, 10, 12].includes(k)) both(t, 0.6, logDrum(k === 6 || k === 12 ? root + 7 : root), sec.bass * (k === 0 ? 1 : 0.8))
    if (sec.keys && [2, 6, 10, 14].includes(k)) for (const [i, m] of chord.entries()) {
      add(keysBus[0], t + i * 0.006, 0.9, epiano(m), sec.keys * sec.lp * (i % 2 ? 0.8 : 1))
      add(keysBus[1], t + i * 0.009, 0.9, epiano(m), sec.keys * sec.lp * (i % 2 ? 1 : 0.8))
    }
  }
  // the marimba hook every other bar, and under the first scene
  const sec = section(t0)
  if (sec.keys && (b % 2 === 0 || t0 < at('chaos'))) MOTIF.forEach((m, i) => {
    const t = t0 + i * (BEAT / 2)
    add(keysBus[0], t, 0.7, marimba(m), 0.9 * sec.lp); add(keysBus[1], t + 0.012, 0.7, marimba(m), 0.75 * sec.lp)
  })
}
// Tom fills into the big scene changes.
for (const id of ['share', 'bank']) for (let i = 0; i < 4; i++) both(at(id) - BEAT + i * s16, 0.4, tom(50 - i * 3), 0.8, i % 2 ? 0.3 : -0.3)
// The drop on the logo, and the last chord ringing out.
both(DROP, 1.2, kick, 1.2)
const endT = DUR - 1.5
both(endT, 0.6, kick, 1)
for (const m of [38, 50, 57, 60, 65, 69]) { add(keysBus[0], endT, 1.6, epiano(m), 1.4); add(keysBus[1], endT + 0.01, 1.6, epiano(m), 1.4) }
MOTIF.slice(0, 4).forEach((m, i) => add(keysBus[0], endT + 0.25 + i * 0.12, 0.8, marimba(m + 12), 0.6))

// Simple stereo reverb on the keys: a few feedback combs per side.
function reverb(x, delays, fb = 0.72, damp = 0.35) {
  const out = new Float32Array(N)
  for (const d of delays) {
    const D = Math.floor(d * SR), buf = new Float32Array(D); let idx = 0, lp = 0
    for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * (1 - damp) + lp * damp; buf[idx] = x[i] + lp * fb; idx = (idx + 1) % D; out[i] += y / delays.length }
  }
  return out
}
const wetL = reverb(keysBus[0], [0.0297, 0.0371, 0.0411, 0.0437]), wetR = reverb(keysBus[1], [0.0309, 0.0353, 0.0423, 0.0449])
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh((L[i] + keysBus[0][i] + wetL[i] * 0.45) * 0.9)
  R[i] = Math.tanh((R[i] + keysBus[1][i] + wetR[i] * 0.45) * 0.9)
}
// Fade out the tail.
for (let i = Math.floor((DUR - 0.4) * SR); i < N; i++) { const f = (N - i) / (0.4 * SR); L[i] *= f; R[i] *= f }
writeWav('out/music.wav', [L, R])
console.log('music', DUR.toFixed(2) + 's')

// Sound effects
writeWav('out/sfx.wav', renderCues(CUES, DUR))
console.log('sfx', CUES.length, 'cues')

// Voice: each line on its beat (a `clip` plays part of a take, with short fades at the cut).
const inputs = VO.flatMap((v) => ['-i', `audio/vo/l${v.line}.wav`])
const trim = (v) => (v.clip ? `atrim=${v.clip[0]}:${v.clip[1]},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(v.clip[1] - v.clip[0] - 0.04).toFixed(3)}:d=0.04,` : '')
const chains = VO.map((v, i) => `[${i}:a]${trim(v)}aformat=sample_rates=48000:channel_layouts=mono,adelay=${Math.round(v.at * 1000)}[v${i}]`).join(';')
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex',
  `${chains};${VO.map((_, i) => `[v${i}]`).join('')}amix=inputs=${VO.length}:normalize=0,apad,atrim=0:${DUR},highpass=f=80,acompressor=threshold=0.1:ratio=3:attack=5:release=120,pan=stereo|c0=c0|c1=c0[out]`,
  '-map', '[out]', '-ar', '48000', 'out/voice.wav'])
console.log('voice', VO.map((v) => `L${v.line}${v.part ?? ''}@${v.at.toFixed(2)}`).join(' '))
