import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { one, run } from './db'
import { safeFetch } from './net'

// Pluggable image storage. Items first save the remote image URL, then a copy is made here
// so a list never breaks when a shop changes its pictures. LocalStore writes files to
// UPLOAD_DIR; DbStore (IMAGE_STORE=database) keeps the bytes in the app database, for hosts
// without a persistent disk. Both are served from /media/<key>.

export interface ImageStore {
  /** Saves the bytes and returns a URL the browser can load. */
  put(key: string, bytes: Buffer, contentType: string): Promise<string>
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export const MAX_IMAGE_BYTES = 6_000_000

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? 'uploads')

class LocalStore implements ImageStore {
  async put(key: string, bytes: Buffer) {
    const file = path.join(UPLOAD_DIR, key)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, bytes)
    return `/media/${key}`
  }
}

// Big photos are scaled down before going into the database: phones send 4–6 MB pictures,
// and nothing on the site shows them wider than this.
const DB_MAX_BYTES = 1_000_000
const DB_MAX_SIDE = 2000

class DbStore implements ImageStore {
  async put(key: string, bytes: Buffer, contentType: string) {
    let body = bytes
    if (bytes.byteLength > DB_MAX_BYTES && contentType !== 'image/gif') {
      body = await sharp(bytes)
        .rotate()
        .resize(DB_MAX_SIDE, DB_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
        .toFormat(contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpeg', { quality: 82 })
        .toBuffer()
    }
    await run('INSERT INTO media (key, type, bytes, created_at) VALUES (?, ?, ?, ?)', [key, contentType, body, Date.now()])
    return `/media/${key}`
  }
}

const useDb = process.env.IMAGE_STORE === 'database'
let store: ImageStore | null = null

function getStore(): ImageStore {
  store ??= useDb ? new DbStore() : new LocalStore()
  return store
}

export function isSupportedImage(contentType: string) {
  return contentType.split(';')[0].trim().toLowerCase() in EXT
}

export async function saveImage(folder: string, bytes: Buffer, contentType: string) {
  const type = contentType.split(';')[0].trim().toLowerCase()
  const ext = EXT[type]
  if (!ext) throw new Error(`Unsupported image type ${type}`)
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Image is too large')
  const key = `${folder}/${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`
  return getStore().put(key, bytes, type)
}

/** Copies a remote image into storage. Returns null if it can't be fetched as an image. */
export async function copyRemoteImage(url: string, folder = 'items') {
  try {
    // Search thumbnails sometimes arrive inline as data: URLs.
    const inline = url.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
    if (inline) return isSupportedImage(inline[1]) ? await saveImage(folder, Buffer.from(inline[2], 'base64'), inline[1]) : null
    const res = await safeFetch(url, { accept: 'image/avif,image/webp,image/*', maxBytes: MAX_IMAGE_BYTES, timeoutMs: 12_000 })
    if (res.status >= 400 || !isSupportedImage(res.contentType) || res.body.byteLength === 0) return null
    return await saveImage(folder, res.body, res.contentType)
  } catch (err) {
    console.warn('[storage] could not copy image', url, err instanceof Error ? err.message : err)
    return null
  }
}

/** Reads a stored image for the /media route and link previews. */
export async function readMedia(key: string) {
  if (useDb) {
    const row = await one<{ type: string; bytes: ArrayBuffer }>('SELECT type, bytes FROM media WHERE key = ?', [key])
    return row ? { bytes: Buffer.from(row.bytes), type: row.type } : null
  }
  const file = path.resolve(UPLOAD_DIR, key)
  if (!file.startsWith(UPLOAD_DIR + path.sep)) return null
  try {
    const bytes = await readFile(file)
    const ext = path.extname(file).slice(1)
    const type = Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream'
    return { bytes, type }
  } catch {
    return null
  }
}
