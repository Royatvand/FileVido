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
    `${SUPABASE_URL}/rest/v1/fcm_tokens?select=id,token,device_key&platform=eq.android&order=last_seen_at.desc&limit=5000`,
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

function getRolloutBucket(deviceKey, versionCode) {
  if (!deviceKey) return null
  const value = `${versionCode}:${deviceKey}`
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

function isDeviceInRollout(row, versionCode, fromRolloutPercentage, rolloutPercentage) {
  const bucket = getRolloutBucket(row.device_key, versionCode)
  if (bucket === null) return fromRolloutPercentage === 0 && rolloutPercentage >= 100
  return bucket >= fromRolloutPercentage && bucket < rolloutPercentage
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
    process.env.RELEASE_TOKEN &&
    req.headers['x-release-secret'] === process.env.RELEASE_TOKEN,
  )
  const accessToken = getBearer(req)
  if (!internalRelease) {
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

  const versionCode = Number(body.version_code)
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    return json(res, 400, { message: 'کد نسخه معتبر نیست.' })
  }

  // Never trust rollout or paused flags from request payloads. Load the authoritative
  // release row so a caller cannot bypass a paused release or widen its rollout.
  const supabaseKey = SERVICE_ROLE || PUBLISHABLE
  const supabaseAuth = SERVICE_ROLE || accessToken
  if (!SUPABASE_URL || !supabaseKey || !supabaseAuth) {
    return json(res, 503, { message: 'دسترسی امن به اطلاعات نسخه در Supabase تنظیم نشده است.' })
  }

  let release
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/app_versions?select=version_code,version_name,changelog,download_url,is_mandatory,is_published,rollout_percentage,is_paused&version_code=eq.${versionCode}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseAuth}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    )
    const rows = await response.json().catch(() => [])
    if (!response.ok) throw new Error('Unable to read authoritative release row')
    release = rows?.[0] || null
  } catch {
    return json(res, 502, { message: 'خواندن وضعیت واقعی نسخه از Supabase ناموفق بود.' })
  }

  if (!release || !release.is_published) {
    return json(res, 404, { message: 'نسخه منتشرشده‌ای با این کد پیدا نشد.' })
  }

  if (release.is_paused) {
    return json(res, 200, {
      status: 'paused',
      sent: 0,
      message: 'انتشار این نسخه متوقف است؛ اعلان جدیدی ارسال نشد.',
    })
  }

  const rolloutPercentage = Number(release.rollout_percentage ?? 100)
  const fromRolloutPercentage = Number(body.from_rollout_percentage ?? 0)
  if (![10, 25, 50, 100].includes(rolloutPercentage)) {
    return json(res, 409, { message: 'درصد انتشار ذخیره‌شده برای این نسخه معتبر نیست.' })
  }
  if (![0, 10, 25, 50].includes(fromRolloutPercentage) || fromRolloutPercentage >= rolloutPercentage) {
    return json(res, 400, { message: 'بازه گروه اعلان برای این مرحله معتبر نیست.' })
  }

  let downloadUrl
  try {
    downloadUrl = new URL(release.download_url)
  } catch {
    return json(res, 409, { message: 'لینک دانلود ثبت‌شده برای این نسخه معتبر نیست.' })
  }
  if (downloadUrl.protocol !== 'https:' || downloadUrl.username || downloadUrl.password) {
    return json(res, 409, { message: 'لینک دانلود ثبت‌شده برای این نسخه امن نیست.' })
  }

  const versionName = release.version_name
  const versionPayload = {
    version_name: versionName,
    version_code: release.version_code,
    download_url: downloadUrl.toString(),
    changelog: typeof release.changelog === 'string' ? release.changelog.slice(0, 5000) : '',
    is_mandatory: release.is_mandatory === true,
  }

  if (!firebaseConfigured()) {
    return json(res, 501, {
      status: 'not_configured',
      message:
        'زیرساخت اعلان آماده است اما Firebase پیکربندی نشده. این متغیرها را در محیط سرور (Vercel) تنظیم کنید: FIREBASE_PROJECT_ID، FIREBASE_CLIENT_EMAIL، FIREBASE_PRIVATE_KEY. همچنین فایل google-services.json را در android/app قرار دهید و جدول fcm_tokens را در Supabase اجرا کنید.',
    })
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
  const eligibleTokens = tokens.filter((row) =>
    isDeviceInRollout(row, versionCode, fromRolloutPercentage, rolloutPercentage),
  )
  if (!eligibleTokens.length) {
    return json(res, 200, {
      status: 'ok',
      sent: 0,
      failed: 0,
      total: 0,
      registered_tokens: tokens.length,
      rollout_percentage: rolloutPercentage,
      from_rollout_percentage: fromRolloutPercentage,
      message: tokens.length
        ? `درصد انتشار ${rolloutPercentage}٪ است؛ هنوز توکنی در گروه جدید ${fromRolloutPercentage} تا ${rolloutPercentage} درصد پیدا نشد.`
        : 'هیچ توکن FCM ثبت‌شده‌ای پیدا نشد. پس از نصب اپ و اعطای مجوز اعلان، توکن‌ها ذخیره می‌شوند.',
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
  for (const row of eligibleTokens) {
    try {
      const outcome = await sendFcmMessage(googleToken, row.token, {
        title,
        body: bodyText,
        version_name: versionName,
        version_code: versionPayload.version_code,
        download_url: versionPayload.download_url,
        is_mandatory: versionPayload.is_mandatory,
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
    total: eligibleTokens.length,
    registered_tokens: tokens.length,
    rollout_percentage: rolloutPercentage,
    from_rollout_percentage: fromRolloutPercentage,
    message: `اعلان گروه ${fromRolloutPercentage} تا ${rolloutPercentage} درصد برای ${sent} از ${eligibleTokens.length} دستگاه ارسال شد${failed ? ` (${failed} ناموفق)` : ''}.`,
  })
}
