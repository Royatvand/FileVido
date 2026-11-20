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

async function verifyAdmin(accessToken) {
  if (!SUPABASE_URL || !accessToken) return null
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: PUBLISHABLE || SERVICE_ROLE || '',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) return null
  const user = await response.json()
  if (user?.app_metadata?.role !== 'admin') return null
  return user
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' })
  }

  const internalRelease = Boolean(
    process.env.GITHUB_RELEASE_TOKEN &&
    req.headers['x-release-secret'] === process.env.GITHUB_RELEASE_TOKEN,
  )
  const accessToken = getBearer(req)
  if (!internalRelease) {
    const admin = await verifyAdmin(accessToken)
    if (!admin) {
      return json(res, 401, { message: 'فقط مدیر می‌تواند اعلان ارسال کند.' })
    }
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
  const updateSummary = changelog
    ? changelog.slice(0, 140)
    : 'برای دریافت آخرین قابلیت‌ها، اپ چارت مسترز را به‌روز کنید.'
  const bodyText = `${updateSummary}\n\n✈️ مشکل در نصب؟ پشتیبانی تلگرام: @Chartmasters_admin`

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

  let sent = 0
  let failed = 0
  for (const row of tokens) {
    try {
      const outcome = await sendFcmMessage(googleToken, row.token, {
        title,
        body: bodyText,
        version_name: versionName,
        version_code: body.version_code,
        download_url: body.download_url,
        is_mandatory: body.is_mandatory,
      })
      if (outcome.ok) sent += 1
      else failed += 1
    } catch {
      failed += 1
    }
  }

  return json(res, 200, {
    status: 'ok',
    sent,
    failed,
    total: tokens.length,
    message: `اعلان برای ${sent} از ${tokens.length} دستگاه ارسال شد${failed ? ` (${failed} ناموفق)` : ''}.`,
  })
}
