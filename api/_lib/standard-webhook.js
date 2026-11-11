// اعتبارسنجی امضای Standard Webhooks (همان روشی که Supabase Auth Hooks استفاده می‌کند)
import { createHmac, timingSafeEqual } from 'node:crypto'

const TOLERANCE_SECONDS = 5 * 60

export function verifyWebhook(rawBody, headers, secret) {
  const id = headers['webhook-id']
  const timestamp = headers['webhook-timestamp']
  const signatureHeader = headers['webhook-signature']
  if (!id || !timestamp || !signatureHeader || !secret) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false

  // مقدار Secret در Supabase به شکل v1,whsec_<base64> است
  const key = Buffer.from(secret.replace(/^v1,whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()

  return String(signatureHeader).split(' ').some((part) => {
    const [version, value] = part.split(',')
    if (version !== 'v1' || !value) return false
    const given = Buffer.from(value, 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}
