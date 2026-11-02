// Captures real GiftMe screens from the demo server (port 3300) for the film.
//   node video/scripts/capture.mjs <cookie>
import { chromium } from '/Users/ubokabasi/.claude/skills/motion-reel/kit/node_modules/playwright/index.mjs'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3300'
const OUT = new URL('../assets/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const cookie = process.argv[2]
const browser = await chromium.launch()

async function ctx(opts) {
  const c = await browser.newContext({ deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce', ...opts })
  await c.addCookies([{ name: 'gm_dev_session', value: cookie, url: BASE }, { name: 'theme', value: 'light', url: BASE }])
  return c
}
const settle = (p) => p.waitForTimeout(1200)
async function shot(page, name, opts = {}) {
  await page.screenshot({ path: OUT + name + '.png', ...opts })
  console.log('saved', name)
}
async function el(page, selector, name) {
  const loc = page.locator(selector).first()
  await loc.scrollIntoViewIfNeeded()
  await loc.screenshot({ path: OUT + name + '.png' })
  console.log('saved', name)
}

// Desktop guest view
{
  const c = await ctx({ viewport: { width: 1440, height: 900 } })
  const p = await c.newPage()
  await p.goto(BASE + '/w/amaka/wedding', { waitUntil: 'networkidle' })
  await settle(p)
  await shot(p, 'guest-desktop')
  await shot(p, 'guest-desktop-full', { fullPage: true })
  await p.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await settle(p)
  await shot(p, 'dashboard')
  await p.getByText('Amaka & Tobi’s wedding').first().click()
  await p.waitForLoadState('networkidle')
  await settle(p)
  await shot(p, 'owner-wishlist')
  await shot(p, 'owner-wishlist-full', { fullPage: true })
  console.log('owner url', p.url())
  await c.close()
}

// Phone guest view, plus the contribute flow
{
  const c = await ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await c.newPage()
  await p.goto(BASE + '/w/amaka/wedding', { waitUntil: 'networkidle' })
  await settle(p)
  await shot(p, 'phone-guest-top')
  await shot(p, 'phone-guest-full', { fullPage: true })
  const contribute = p.getByRole('button', { name: /contribute/i }).first()
  await contribute.scrollIntoViewIfNeeded()
  await shot(p, 'phone-guest-item')
  await contribute.click()
  await settle(p)
  await shot(p, 'phone-contribute-open')
  await c.close()
}
await browser.close()
