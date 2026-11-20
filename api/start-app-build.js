const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed' })
  const bearer = String(req.headers.authorization || '').match(/^Bearer\\s+(.+)$/i)?.[1]
  if (!SUPABASE_URL || !SUPABASE_KEY || !bearer) return send(res, 401, { message: 'نشست مدیر معتبر نیست.' })

  const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${bearer}` },
  })
  if (!authResponse.ok) return send(res, 401, { message: 'نشست مدیر معتبر نیست.' })
  const user = await authResponse.json()
  if (user?.app_metadata?.role !== 'admin') return send(res, 403, { message: 'فقط مدیر می‌تواند نسخه جدید بسازد.' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const changelog = typeof body?.changelog === 'string' ? body.changelog.trim() : ''
  if (!changelog || changelog.length > 5000) return send(res, 400, { message: 'توضیحات تغییرات الزامی است و باید کمتر از ۵۰۰۰ کاراکتر باشد.' })
  if (!process.env.RELEASE_TOKEN) return send(res, 503, { message: 'متغیر RELEASE_TOKEN در Vercel تنظیم نشده است.' })

  const dispatch = await fetch('https://api.github.com/repos/Royatvand/FileVido/actions/workflows/android-apk.yml/dispatches', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RELEASE_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'feature/automatic-android-releases', inputs: { changelog, is_mandatory: body?.is_mandatory === true ? 'true' : 'false' } }),
  })
  if (!dispatch.ok) {
    const detail = await dispatch.text()
    console.error('GitHub workflow dispatch failed', dispatch.status, detail.slice(0, 500))
    return send(res, 502, { message: 'GitHub نتوانست فرایند ساخت نسخه را شروع کند؛ دسترسی توکن و مجوز Actions را بررسی کن.' })
  }
  return send(res, 202, { status: 'queued', message: 'ساخت نسخه در GitHub Actions شروع شد.' })
}
