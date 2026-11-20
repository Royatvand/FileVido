/**
 * Server-side FCM sender for Android app update notifications.
 * Secrets stay on the server (Vercel env). Never call FCM from the browser.
 *
 * Required env (when you are ready to enable real push):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (PEM; newlines as \n)
 * Optional:
 *   SUPABASE_URL / VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (preferred for listing tokens)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (fallback; needs admin JWT)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLISHABLE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY

const FCM_TIMEOUT_MS = 8000
const FCM_CONCURRENCY = 20
const SEND_BUDGET_MS = 50000 // must stay below maxDuration (60s) in vercel.json
const PRUNE_CHUNK = 50

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function getBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

/** Returns { user } for an admin, or { error: 'config' | 'session' | 'forbidden' }. */
async function verifyAdmin(accessToken) {
  const apikey = PUBLISHABLE || SERVICE_ROLE
  if (!SUPABASE_URL || !apikey) return { error: 'config' }
  if (!accessToken) return { error: 'session' }
  let response
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      signal: AbortSignal.timeout(8000),
      headers: { apikey, Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    return { error: 'config' }
  }
  if (!response.ok) return { error: 'session' }
  const user = await response.json().catch(() => null)
  if (user?.app_metadata?.role !== 'admin') return { error: 'forbidden' }
  return { user }
}

async function listFcmTokens(adminToken) {
  if (!SUPABASE_URL) return []
  const key = SERVICE_ROLE || PUBLISHABLE
  const auth = SERVICE_ROLE ? SERVICE_ROLE : adminToken
  if (!key || !auth) return []

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/fcm_tokens?select=id,token&platform=eq.android&order=last_seen_at.desc&limit=5000`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${auth}`,
      },
    },
  )
  if (!response.ok) {
    console.error('Unable to read FCM tokens from Supabase', { status: response.status })
    throw new Error('خواندن توکن‌های اعلان از Supabase ناموفق بود.')
  }
  return (await response.json().catch(() => [])) || []
}

function firebaseConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  )
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

async function getGoogleAccessToken() {
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  if (!privateKey) throw new Error('Firebase private key is empty')

  const keyBytes = Buffer.from(privateKey, 'base64')
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const now = Math.floor(Date.now() / 1000)
  const assertionHeader = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const assertionClaims = base64Url(JSON.stringify({
    iss: process.env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsignedAssertion = `${assertionHeader}.${assertionClaims}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedAssertion),
  )
  const assertion = `${unsignedAssertion}.${base64Url(Buffer.from(signature))}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.access_token) {
    throw new Error('Google OAuth token exchange failed')
  }
  return result.access_token
}

async function sendFcmMessage(accessToken, token, payload) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(FCM_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            type: 'app_update',
            version_name: String(payload.version_name || ''),
            version_code: String(payload.version_code || ''),
            download_url: String(payload.download_url || ''),
            is_mandatory: payload.is_mandatory ? '1' : '0',
          },
          android: {
            priority: 'HIGH',
            notification: {
              channelId: 'app_updates',
            },
          },
        },
      }),
    },
  )
  const result = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, result }
}

function isInvalidTokenOutcome(outcome) {
  if (outcome.status === 404) return true
  const details = outcome.result?.error?.details
  const code = Array.isArray(details)
    ? details.map((item) => item?.errorCode).find(Boolean)
    : null
  return code === 'UNREGISTERED'
}

/** One retry for rate limits / transient server errors. */
async function sendWithRetry(accessToken, token, payload) {
  let outcome = await sendFcmMessage(accessToken, token, payload)
  if (outcome.status === 429 || outcome.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    outcome = await sendFcmMessage(accessToken, token, payload)
  }
  return outcome
}

/** Send to every row with bounded concurrency, a per-request timeout and a total time budget. */
export async function sendToAll(accessToken, rows, payload, options = {}) {
  const concurrency = options.concurrency || FCM_CONCURRENCY
  const budgetMs = options.budgetMs ?? SEND_BUDGET_MS
  const deadline = Date.now() + budgetMs
  const stats = { sent: 0, failed: 0, skipped: 0, invalidIds: [] }
  let index = 0

  async function worker() {
    while (index < rows.length) {
      if (Date.now() >= deadline) return
      const row = rows[index]
      index += 1
      try {
        const outcome = await sendWithRetry(accessToken, row.token, payload)
        if (outcome.ok) stats.sent += 1
        else {
          stats.failed += 1
          if (isInvalidTokenOutcome(outcome)) stats.invalidIds.push(row.id)
        }
      } catch {
        stats.failed += 1
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker))
  stats.skipped = Math.max(0, rows.length - index)
  return stats
}

/** Remove tokens FCM reported as dead so they are not retried on every release. */
async function pruneTokens(ids, adminToken) {
  if (!ids.length || !SUPABASE_URL) return 0
  const key = SERVICE_ROLE || PUBLISHABLE
  const auth = SERVICE_ROLE || adminToken
  if (!key || !auth) return 0
  let pruned = 0
  for (let i = 0; i < ids.length; i += PRUNE_CHUNK) {
    const chunk = ids.slice(i, i + PRUNE_CHUNK)
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/fcm_tokens?id=in.(${chunk.join(',')})`,
        {
          method: 'DELETE',
          signal: AbortSignal.timeout(8000),
          headers: { apikey: key, Authorization: `Bearer ${auth}`, Prefer: 'return=minimal' },
        },
      )
      if (response.ok) pruned += chunk.length
    } catch {
      /* best effort */
    }
  }
  return pruned
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' })
  }

  const accessToken = getBearer(req)
  const auth = await verifyAdmin(accessToken)
  if (auth.error === 'config') {
    return json(res, 500, { message: 'متغیرهای Supabase (آدرس و کلید عمومی) روی سرور Vercel تنظیم نشده‌اند.' })
  }
  if (auth.error === 'session') {
    return json(res, 401, { message: 'نشست ادمین نامعتبر یا منقضی است. دوباره وارد پنل ادمین شوید.' })
  }
  if (auth.error === 'forbidden') {
    return json(res, 403, { message: 'فقط مدیر می‌تواند اعلان ارسال کند.' })
  }

  if (!firebaseConfigured()) {
    return json(res, 501, {
      status: 'not_configured',
      message:
        'زیرساخت اعلان آماده است اما Firebase پیکربندی نشده. این متغیرها را در محیط سرور (Vercel) تنظیم کنید: FIREBASE_PROJECT_ID، FIREBASE_CLIENT_EMAIL، FIREBASE_PRIVATE_KEY. همچنین فایل google-services.json را در android/app قرار دهید و جدول fcm_tokens را در Supabase اجرا کنید.',
    })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  body = body || {}

  const versionName = typeof body.version_name === 'string' ? body.version_name.trim() : ''
  const versionCode = Number(body.version_code)
  let downloadUrl
  try {
    downloadUrl = new URL(body.download_url)
  } catch {
    return json(res, 400, { message: 'لینک دانلود نسخه معتبر نیست.' })
  }
  if (
    !versionName ||
    !Number.isInteger(versionCode) ||
    versionCode < 1 ||
    downloadUrl.protocol !== 'https:' ||
    downloadUrl.username ||
    downloadUrl.password
  ) {
    return json(res, 400, { message: 'اطلاعات نسخه یا لینک دانلود معتبر نیست.' })
  }
  if (typeof body.changelog === 'string' && body.changelog.length > 5000) {
    return json(res, 400, { message: 'توضیحات تغییرات بیش از حد طولانی است.' })
  }

  const versionPayload = {
    version_name: versionName,
    version_code: versionCode,
    download_url: downloadUrl.toString(),
    changelog: typeof body.changelog === 'string' ? body.changelog : '',
    is_mandatory: body.is_mandatory === true,
  }
  const title = versionPayload.is_mandatory
    ? `آپدیت اجباری ${versionName}`
    : `نسخه جدید ${versionName} آماده است`
  const changelog = versionPayload.changelog.trim()
  const bodyText = changelog
    ? changelog.slice(0, 180)
    : 'برای دریافت آخرین قابلیت‌ها، اپ چارت مسترز را به‌روز کنید.'

  let tokens
  try {
    tokens = await listFcmTokens(accessToken)
  } catch {
    return json(res, 502, { message: 'دریافت فهرست دستگاه‌ها از Supabase ناموفق بود.' })
  }
  if (!tokens.length) {
    return json(res, 200, {
      status: 'ok',
      sent: 0,
      message: 'هیچ توکن FCM ثبت‌شده‌ای پیدا نشد. پس از نصب اپ و اعطای مجوز اعلان، توکن‌ها ذخیره می‌شوند.',
    })
  }

  let googleToken
  try {
    googleToken = await getGoogleAccessToken()
  } catch (error) {
    return json(res, 500, {
      message: 'احراز هویت Firebase ناموفق بود. کلید سرویس‌اکانت را بررسی کنید.',
      detail: error?.message || String(error),
    })
  }

  // Dedupe defensively (the unique index should already guarantee this).
  const unique = [...new Map(tokens.filter((row) => row?.token).map((row) => [row.token, row])).values()]
  const { sent, failed, skipped, invalidIds } = await sendToAll(googleToken, unique, {
    title,
    body: bodyText,
    version_name: versionName,
    version_code: body.version_code,
    download_url: body.download_url,
    is_mandatory: body.is_mandatory,
  })
  const pruned = await pruneTokens(invalidIds, accessToken)

  return json(res, 200, {
    status: 'ok',
    sent,
    failed,
    skipped,
    pruned,
    truncated: skipped > 0,
    total: unique.length,
    message: `اعلان برای ${sent} از ${unique.length} دستگاه ارسال شد${failed ? ` (${failed} ناموفق` : ''}${pruned ? `${failed ? '، ' : ' ('}${pruned} توکن نامعتبر حذف شد` : ''}${failed || pruned ? ')' : ''}${skipped ? `؛ ${skipped} دستگاه به دلیل محدودیت زمان ارسال نشد، دوباره اجرا کنید` : ''}.`,
  })
}
