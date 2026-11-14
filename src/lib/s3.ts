import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET!
const CDN = process.env.CLOUDFRONT_URL ?? `https://${BUCKET}.s3.amazonaws.com`

export async function uploadToS3(
  buffer: Buffer,
  mimeType: string,
  prefix: 'temp' | 'items' | 'thumbnails'
): Promise<string> {
  const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg'
  const key = `${prefix}/${uuidv4()}.${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  )

  return `${CDN}/${key}`
}

function urlToS3Key(url: string): string {
  try {
    // pathname is like "/temp/uuid.jpg" — strip the leading slash
    return new URL(url).pathname.replace(/^\//, '')
  } catch {
    // fallback: strip any known prefix
    return url.replace(`${CDN}/`, '').replace(/^\//, '')
  }
}

export async function copyS3Object(fromUrl: string, toPrefix: string): Promise<string> {
  const fromKey = urlToS3Key(fromUrl)
  const filename = fromKey.split('/').pop()!
  const toKey = `${toPrefix}/${filename}`

  await s3.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${fromKey}`,
      Key: toKey,
    })
  )

  return `${CDN}/${toKey}`
}

export async function moveS3Object(fromUrl: string, toPrefix: string): Promise<string> {
  const copiedUrl = await copyS3Object(fromUrl, toPrefix)
  const fromKey = urlToS3Key(fromUrl)
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fromKey }))
  return copiedUrl
}

export async function deleteFromS3(url: string): Promise<void> {
  const key = urlToS3Key(url)
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
