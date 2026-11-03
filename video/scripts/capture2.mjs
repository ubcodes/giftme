// Captures full pages plus the boxes of the elements the film animates over (in CSS px; images are 2x).
import { chromium } from '/Users/ubokabasi/.claude/skills/motion-reel/kit/node_modules/playwright/index.mjs'
import { writeFileSync } from 'node:fs'

const BASE = 'http://localhost:3300'
const OUT = new URL('../assets/', import.meta.url).pathname
const cookie = process.argv[2]
const browser = await chromium.launch()
const boxes = {}
async function ctx(opts) {
  const c = await browser.newContext({ deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce', ...opts })
  await c.addCookies([{ name: 'gm_dev_session', value: cookie, url: BASE }])
  return c
}
async function box(page, key, loc) {
  const b = await loc.first().boundingBox()
  const scroll = await page.evaluate(() => window.scrollY)
  boxes[key] = b && { x: Math.round(b.x), y: Math.round(b.y + scroll), w: Math.round(b.width), h: Math.round(b.height) }
}
const settle = (p) => p.waitForTimeout(1200)

{
  const c = await ctx({ viewport: { width: 1440, height: 900 } })
  const p = await c.newPage()
  await p.goto(BASE + '/dashboard/w/wl_mvzp25e975c590e02f', { waitUntil: 'networkidle' })
  await settle(p)
  await box(p, 'owner.addGift', p.getByRole('button', { name: 'Add a gift' }))
  await box(p, 'owner.share', p.getByText('Share your wishlist').locator('xpath=..'))
  await box(p, 'owner.copy', p.getByRole('button', { name: /copy link/i }))
  await box(p, 'owner.title', p.locator('h1'))
  const rows = p.locator('ul li')
  for (let i = 0; i < Math.min(6, await rows.count()); i++) await box(p, 'owner.row' + i, rows.nth(i))
  await box(p, 'owner.whoGave', p.getByRole('heading', { name: 'Who gave' }).locator('xpath=..'))
  await box(p, 'owner.sayThanks', p.getByRole('button', { name: /say thank you/i }))
  await p.screenshot({ path: OUT + 'owner-full.png', fullPage: true })
  // The add-gift dialog, with a link pasted
  await p.getByRole('button', { name: 'Add a gift' }).click()
  await settle(p)
  await p.screenshot({ path: OUT + 'owner-add-dialog.png' })
  await box(p, 'add.dialog', p.getByRole('dialog'))
  await box(p, 'add.input', p.getByRole('dialog').locator('input').first())
  await c.close()
}
{
  const c = await ctx({ viewport: { width: 1440, height: 900 } })
  const p = await c.newPage()
  await p.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await settle(p)
  await box(p, 'dash.hello', p.locator('h1'))
  await box(p, 'dash.raised', p.getByText(/raised across/))
  await box(p, 'dash.card', p.getByText('Amaka & Tobi’s wedding').first().locator('xpath=ancestor::a[1]'))
  await p.screenshot({ path: OUT + 'dash-full.png', fullPage: true })
  await c.close()
}
{
  const c = await ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await c.newPage()
  await p.goto(BASE + '/w/amaka/wedding', { waitUntil: 'networkidle' })
  await settle(p)
  const cards = p.locator('main li, main article')
  await box(p, 'phone.contribute0', p.getByRole('button', { name: /contribute/i }))
  await box(p, 'phone.reserve', p.getByRole('button', { name: /^reserve/i }))
  await p.screenshot({ path: OUT + 'phone-full.png', fullPage: true })
  await p.getByRole('button', { name: /contribute/i }).first().click()
  await settle(p)
  const d = p.getByRole('dialog')
  await box(p, 'give.dialog', d)
  await box(p, 'give.chip20', d.getByRole('button', { name: '₦20,000' }))
  await box(p, 'give.submit', d.getByRole('button', { name: /^contribute/i }))
  await p.screenshot({ path: OUT + 'phone-give-0.png' })
  await d.getByRole('button', { name: '₦20,000' }).click()
  await d.locator('input').nth(1).fill('Chioma')
  await d.locator('input').nth(2).fill('chioma@giftme.demo')
  await d.locator('textarea').fill('Happy married life! 💐')
  await p.waitForTimeout(400)
  await p.screenshot({ path: OUT + 'phone-give-1.png' })
  await p.goto(BASE + '/thank-you?w=amaka/wedding', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.screenshot({ path: OUT + 'phone-thanks.png' })
  await c.close()
}
writeFileSync(OUT + 'boxes.json', JSON.stringify(boxes, null, 1))
console.log(JSON.stringify(boxes))
await browser.close()
