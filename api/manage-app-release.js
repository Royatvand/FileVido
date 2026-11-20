const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const PUBLISHABLE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ROLLOUT_STAGES = [10, 25, 50, 100]

function send(res, status, body) {
  res.status(status).json(body)
}

function getBearer(req) {
  return String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1] || null
}

async function verifyAdmin(token) {
  if (!SUPABASE_URL || !PUBLISHABLE || !token) return { error: 'session' }
  const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: PUBLISHABLE, Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!response?.ok) return { error: 'session' }
  const user = await response.json().catch(() => null)
  if (user?.app_metadata?.role !== 'admin') return { error: 'forbidden' }
  return { user }
}

async function dbRequest(path, options = {}, adminToken = null) {
  const apiKey = SERVICE_ROLE || PUBLISHABLE
  const authorization = SERVICE_ROLE || adminToken
  if (!SUPABASE_URL || !apiKey || !authorization) throw new Error('Supabase server configuration is incomplete.')
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: options.method || 'GET',
    headers: {
      apikey: apiKey,
      Authorization: 'Bearer ' + authorization,
      'Content-Type': 'application/json',
      ...(options.method === 'PATCH' ? { Prefer: 'return=representation' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    console.error('App release management database request failed', response.status, JSON.stringify(data).slice(0, 400))
    throw new Error('ذخیره تنظیمات انتشار در Supabase ناموفق بود.')
  }
  return data
}

async function sendReleaseNotification(release, fromRolloutPercentage = 0, adminToken = null) {
  if (!process.env.RELEASE_TOKEN) {
    return { status: 'not_configured', message: 'مرحله انتشار ذخیره شد؛ توکن اعلان سرور تنظیم نشده است.' }
  }
  const baseUrl = process.env.VERCEL_URL
    ? 'https://' + process.env.VERCEL_URL
    : 'https://www.chartmasters.top'
  try {
    const response = await fetch(baseUrl + '/api/notify-app-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-release-secret': process.env.RELEASE_TOKEN,
        ...(adminToken ? { Authorization: 'Bearer ' + adminToken } : {}),
      },
      body: JSON.stringify({ ...release, from_rollout_percentage: fromRolloutPercentage }),
      signal: AbortSignal.timeout(20000),
    })
    const result = await response.json().catch(() => ({}))
    return {
      status: response.ok ? (result.status || 'ok') : 'unavailable',
      message: result.message || (response.ok ? 'اعلان مرحله جدید ارسال شد.' : 'مرحله ذخیره شد؛ ارسال اعلان ناموفق بود.'),
    }
  } catch {
    return { status: 'unavailable', message: 'مرحله ذخیره شد؛ ارتباط با سرویس اعلان برقرار نشد.' }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed' })

  // Preview deployments share the production Supabase project. Keep all release
  // mutations production-only so preview testing cannot pause or roll back live users.
  if (process.env.VERCEL_ENV !== 'production') {
    return send(res, 409, {
      message: 'برای محافظت از نسخه زنده، تغییر وضعیت انتشار در Preview غیرفعال است. پس از مرج، این عملیات در Production فعال می‌شود.',
    })
  }

  const adminToken = getBearer(req)
  const auth = await verifyAdmin(adminToken)
  if (auth.error === 'session') return send(res, 401, { message: 'نشست مدیر نامعتبر یا منقضی است.' })
  if (auth.error === 'forbidden') return send(res, 403, { message: 'فقط مدیر می‌تواند انتشار نسخه را مدیریت کند.' })
  if (!SERVICE_ROLE && !PUBLISHABLE) return send(res, 503, { message: 'کلید Supabase روی سرور تنظیم نشده است.' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const versionId = typeof body?.version_id === 'string' ? body.version_id.trim() : ''
  const action = String(body?.action || '')
  if (!versionId || !['increase_rollout', 'pause', 'rollback', 'resume'].includes(action)) {
    return send(res, 400, { message: 'درخواست مدیریت انتشار معتبر نیست.' })
  }

  try {
    const columns = 'id,version_code,version_name,changelog,download_url,is_mandatory,is_published,published_at,rollout_percentage,is_paused,paused_at'
    const rows = await dbRequest('app_versions?select=' + columns + '&id=eq.' + encodeURIComponent(versionId) + '&limit=1', {}, adminToken)
    const release = rows?.[0]
    if (!release) return send(res, 404, { message: 'نسخه موردنظر پیدا نشد.' })
    if (!release.is_published) return send(res, 409, { message: 'فقط نسخه منتشرشده قابل مدیریت است.' })

    const publishedRows = await dbRequest('app_versions?select=' + columns + '&is_published=eq.true&order=version_code.desc', {}, adminToken)
    if (publishedRows?.[0]?.id !== release.id) {
      return send(res, 409, { message: 'برای جلوگیری از تغییر نسخه اشتباه، فقط آخرین نسخه منتشرشده قابل مدیریت است.' })
    }

    const now = new Date().toISOString()
    let updatedRelease = null
    let fallbackRelease = null
    let notification = null

    if (action === 'increase_rollout') {
      if (release.is_paused) return send(res, 409, { message: 'انتشار این نسخه متوقف است؛ ابتدا آن را آگاهانه از سر بگیر.' })
      const currentStage = Number(release.rollout_percentage ?? 100)
      const nextStage = ROLLOUT_STAGES.find((stage) => stage > currentStage)
      const requestedStage = Number(body.rollout_percentage)
      if (!nextStage || requestedStage !== nextStage) {
        return send(res, 409, { message: nextStage ? 'انتشار فقط باید به مرحله بعدی افزایش پیدا کند.' : 'این نسخه به مرحله انتشار ۱۰۰٪ رسیده است.' })
      }
      const result = await dbRequest('app_versions?id=eq.' + encodeURIComponent(versionId), {
        method: 'PATCH',
        body: { rollout_percentage: nextStage, updated_at: now },
      }, adminToken)
      updatedRelease = result?.[0]
      if (!updatedRelease) throw new Error('به‌روزرسانی مرحله انتشار انجام نشد.')
      notification = await sendReleaseNotification(updatedRelease, currentStage, adminToken)
      return send(res, 200, {
        status: 'updated',
        version: updatedRelease,
        message: 'درصد انتشار نسخه به ' + nextStage + '٪ افزایش یافت.',
        notification,
      })
    }

    if (action === 'pause') {
      if (release.is_paused) return send(res, 409, { message: 'انتشار این نسخه از قبل متوقف شده است.' })
      const result = await dbRequest('app_versions?id=eq.' + encodeURIComponent(versionId), {
        method: 'PATCH',
        body: { is_paused: true, paused_at: now, updated_at: now },
      }, adminToken)
      updatedRelease = result?.[0]
      if (!updatedRelease) throw new Error('توقف انتشار انجام نشد.')
      return send(res, 200, {
        status: 'paused',
        version: updatedRelease,
        message: 'انتشار نسخه متوقف شد. بررسی آپدیت در اجرای بعدی اپ و اعلان‌های جدید این نسخه متوقف می‌شوند.',
      })
    }

    if (action === 'resume') {
      if (!release.is_paused) return send(res, 409, { message: 'این نسخه در حال انتشار است.' })
      const result = await dbRequest('app_versions?id=eq.' + encodeURIComponent(versionId), {
        method: 'PATCH',
        body: { is_paused: false, paused_at: null, updated_at: now },
      }, adminToken)
      updatedRelease = result?.[0]
      if (!updatedRelease) throw new Error('ادامه انتشار انجام نشد.')
      notification = await sendReleaseNotification(updatedRelease, 0, adminToken)
      return send(res, 200, {
        status: 'resumed',
        version: updatedRelease,
        message: 'انتشار با همان درصد قبلی دوباره فعال شد.',
        notification,
      })
    }

    // Safe rollback means stop the faulty higher version and restore the newest
    // previously published stable release for devices that have not upgraded yet.
    if (release.is_paused) return send(res, 409, { message: 'این نسخه از قبل متوقف شده است.' })
    const pauseResult = await dbRequest('app_versions?id=eq.' + encodeURIComponent(versionId), {
      method: 'PATCH',
      body: { is_paused: true, paused_at: now, updated_at: now },
    }, adminToken)
    updatedRelease = pauseResult?.[0]
    fallbackRelease = (publishedRows || []).find((row) =>
      Number(row.version_code) < Number(release.version_code) &&
      row.is_published &&
      !row.is_paused,
    ) || null

    if (fallbackRelease) {
      const fallbackResult = await dbRequest('app_versions?id=eq.' + encodeURIComponent(fallbackRelease.id), {
        method: 'PATCH',
        body: { rollout_percentage: 100, is_paused: false, paused_at: null, updated_at: now },
      }, adminToken)
      fallbackRelease = fallbackResult?.[0] || fallbackRelease
      // Avoid a misleading push: devices that already installed the higher APK
      // cannot be downgraded by Android. Their fix must be a higher-code hotfix.
    }

    return send(res, 200, {
      status: 'rolled_back',
      version: updatedRelease,
      fallback_version: fallbackRelease,
      message: fallbackRelease
        ? 'نسخه مشکل‌دار متوقف شد و نسخه پایدار قبلی برای کاربران واجد شرایط فعال شد.'
        : 'نسخه مشکل‌دار متوقف شد؛ نسخه پایدار قبلیِ منتشرشده‌ای برای بازگشت وجود ندارد. برای کاربران به‌روزشده باید نسخه اصلاحی با کد بالاتر بسازی.',
      notification,
    })
  } catch (error) {
    console.error('App release management failed', error?.message || error)
    return send(res, 502, { message: error?.message || 'مدیریت انتشار نسخه ناموفق بود.' })
  }
}
