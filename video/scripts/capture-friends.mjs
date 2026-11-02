// Captures the real Friends page for the film's "find your people" beat (demo server on :3300).
//   node video/scripts/capture-friends.mjs <amaka cookie>
import { chromium } from '/Users/ubokabasi/.claude/skills/motion-reel/kit/node_modules/playwright/index.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'http://localhost:3300'
const OUT = new URL('../assets/', import.meta.url).pathname
const browser = await chromium.launch()
const c = await browser.newContext({ deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
await c.addCookies([{ name: 'gm_dev_session', value: process.argv[2], url: BASE }])
const p = await c.newPage()
await p.goto(BASE + '/dashboard/friends', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
await p.screenshot({ path: OUT + 'friends-full.png', fullPage: true })
const boxes = JSON.parse(readFileSync(OUT + 'boxes.json', 'utf8'))
const scroll = await p.evaluate(() => window.scrollY)
const box = async (key, loc) => { const b = await loc.first().boundingBox(); if (b) boxes[key] = { x: Math.round(b.x), y: Math.round(b.y + scroll), w: Math.round(b.width), h: Math.round(b.height) } }
await box('friends.title', p.locator('h1'))
await box('friends.search', p.getByRole('searchbox', { name: 'Search for people' }))
for (const h of await p.locator('h2').allTextContents()) console.log('h2:', h)
await p.getByRole('searchbox', { name: 'Search for people' }).fill('@kemicooks')
await p.waitForTimeout(1800)
await p.screenshot({ path: OUT + 'friends-search.png' })
writeFileSync(OUT + 'boxes.json', JSON.stringify(boxes, null, 1))
console.log(JSON.stringify({ title: boxes['friends.title'], search: boxes['friends.search'] }))
await browser.close()
