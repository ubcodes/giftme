// Writes WebVTT captions for the film from the voice lines and their measured lengths.
//   node film/captions.mjs > ../public/video/giftme-film.vtt   (from video/)
import { readFileSync } from 'node:fs'
import { VO } from './timeline.js'

const LINES = {
  1: 'Birthdays. Weddings. Baby showers.',
  2: 'And everyone asks the same thing… so what do you actually want?',
  3: 'Meet GiftMe.',
  4: 'Paste a link from any shop, or just search for what you’d love.',
  5: 'Share one link with everyone.',
  6: 'Friends chip in any amount, or reserve a gift to buy it themselves.',
  7: 'The money lands straight in your bank, and you say thank you in one tap.',
  8: 'GiftMe. Wishlists your friends can actually give to.',
  9: 'And find your people on GiftMe, so you never miss their big day.',
}
const seg = JSON.parse(readFileSync(new URL('../audio/vo-segments.json', import.meta.url)))
const ts = (s) => new Date(s * 1000).toISOString().slice(11, 23)
console.log('WEBVTT\n')
for (const v of VO) console.log(`${ts(v.at)} --> ${ts(v.at + seg['l' + v.line].dur + 0.3)}\n${LINES[v.line]}\n`)
