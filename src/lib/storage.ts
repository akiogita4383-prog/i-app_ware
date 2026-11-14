import { writeFile, copyFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

type Prefix = 'temp' | 'items' | 'thumbnails'

// CloudFrontが未設定（プレースホルダーのまま）ならローカルストレージを使う
const useLocal =
  !process.env.CLOUDFRONT_URL ||
  process.env.CLOUDFRONT_URL.includes('your-cloudfront-domain')

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}

function localDir(prefix: Prefix) {
  return join(process.cwd(), 'public', 'uploads', prefix)
}

function localUrl(prefix: Prefix, filename: string) {
  return `/uploads/${prefix}/${filename}`
}

function localPath(url: string) {
  // "/uploads/temp/uuid.jpg" → "<cwd>/public/uploads/temp/uuid.jpg"
  return join(process.cwd(), 'public', url)
}

// ── S3 関数は動的 import でのみ参照（ローカル時は呼ばない） ──

export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  prefix: Prefix
): Promise<string> {
  if (useLocal) {
    const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg'
    const filename = `${uuidv4()}.${ext}`
    const dir = localDir(prefix)
    await ensureDir(dir)
    await writeFile(join(dir, filename), buffer)
    return localUrl(prefix, filename)
  }

  const { uploadToS3 } = await import('./s3')
  return uploadToS3(buffer, mimeType, prefix)
}

export async function copyImage(fromUrl: string, toPrefix: 'items' | 'thumbnails'): Promise<string> {
  if (useLocal) {
    const filename = fromUrl.split('/').pop()!
    const toDir = localDir(toPrefix)
    await ensureDir(toDir)
    await copyFile(localPath(fromUrl), join(toDir, filename))
    return localUrl(toPrefix, filename)
  }

  const { copyS3Object } = await import('./s3')
  return copyS3Object(fromUrl, toPrefix)
}

export async function deleteImage(url: string): Promise<void> {
  if (useLocal) {
    try { await unlink(localPath(url)) } catch { /* すでに存在しない場合は無視 */ }
    return
  }

  const { deleteFromS3 } = await import('./s3')
  return deleteFromS3(url)
}
