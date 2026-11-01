// Creates blnk/blnk.json with a fresh secret key (if missing) and copies that key into .env
// as BLNK_SECRET_KEY. Safe to run more than once.
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const configPath = 'blnk/blnk.json'
let key
if (existsSync(configPath)) {
  key = JSON.parse(readFileSync(configPath, 'utf8')).server.secret_key
  console.log(`${configPath} already exists; keeping its key.`)
} else {
  key = randomBytes(24).toString('hex')
  const config = readFileSync('blnk/blnk.example.json', 'utf8').replace('<generate with: openssl rand -hex 24>', key)
  writeFileSync(configPath, config)
  console.log(`Created ${configPath}.`)
}

const envPath = '.env'
let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : readFileSync('.env.example', 'utf8')
if (/^BLNK_SECRET_KEY=.+$/m.test(env)) {
  console.log('.env already has BLNK_SECRET_KEY; left it alone.')
} else {
  env = /^BLNK_SECRET_KEY=$/m.test(env) ? env.replace(/^BLNK_SECRET_KEY=$/m, `BLNK_SECRET_KEY=${key}`) : `${env.trimEnd()}\nBLNK_SECRET_KEY=${key}\n`
  writeFileSync(envPath, env)
  console.log('Wrote BLNK_SECRET_KEY to .env.')
}
