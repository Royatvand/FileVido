const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

function send(res, status, body) { res.status(status).json(body) }

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed' })
  if (!process.env.RELEASE_TOKEN || req.headers['x-release-secret'] !== process.env.RELEASE_TOKEN) {
    return send(res, 401, { message: 'Unauthorized release callback' })
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) return send(res, 503, { message: 'Supabase server configuration is incomplete.' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const versionCode = Number(body?.version_code)
  const versionName = String(body?.version_name || '').trim()
  const downloadUrl = String(body?.download_url || '')
  if (!Number.isInteger(versionCode) || versionCode < 1 || !versionName || !downloadUrl.startsWith('https://github.com/Royatvand/FileVido/releases/download/')) {
    return send(res, 400, { message: 'Release metadata is invalid.' })
  }

  const payload = {
    version_code: versionCode,
    version_name: versionName,
    changelog: String(body.changelog || '').slice(0, 5000),
    download_url: downloadUrl,
    is_mandatory: body.is_mandatory === true,
    is_published: true,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/app_versions?select=id,version_code,rollout_percentage,is_paused&version_code=eq.${versionCode}&limit=1`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
  )
  const existingRows = await existingResponse.json().catch(() => [])
  if (!existingResponse.ok) {
    console.error('Unable to check existing app release', existingResponse.status)
    return send(res, 502, { message: 'بررسی نسخه قبلی در Supabase ناموفق بود.' })
  }

  let saved
  if (existingRows?.[0]?.id) {
    saved = await fetch(`${SUPABASE_URL}/rest/v1/app_versions?id=eq.${existingRows[0].id}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    })
  } else {
    saved = await fetch(`${SUPABASE_URL}/rest/v1/app_versions`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ ...payload, rollout_percentage: 10, is_paused: false, paused_at: null }),
    })
  }
  const rows = await saved.json().catch(() => [])
  if (!saved.ok || !rows?.[0]?.id) {
    console.error('Unable to register app release', saved.status, JSON.stringify(rows).slice(0, 500))
    return send(res, 502, { message: 'APK منتشر شد اما ثبت نسخه در Supabase ناموفق بود.' })
  }

  let notification = 'اعلان خودکار ارسال نشد.'
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://www.chartmasters.top'
    const notify = await fetch(`${baseUrl}/api/notify-app-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-release-secret': process.env.RELEASE_TOKEN },
      body: JSON.stringify(rows[0]),
    })
    const result = await notify.json().catch(() => ({}))
    notification = result.message || (notify.ok ? 'اعلان ارسال شد.' : 'ثبت نسخه انجام شد؛ ارسال اعلان با خطا مواجه شد.')
  } catch (error) {
    console.error('Release notification failed', error)
  }
  return send(res, 200, { status: 'published', version: rows[0], notification })
}
