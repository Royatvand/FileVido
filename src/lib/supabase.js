const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SESSION_KEY = 'tradefarsi_admin_session'

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

async function request(path, options = {}, token) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('تنظیمات اتصال Supabase در محیط پروژه وارد نشده است.')
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const result = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(result?.msg || result?.message || result?.error_description || result?.hint || 'درخواست با خطا مواجه شد.')
  }
  return result
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null
  const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  const nextSession = { ...refreshed, expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600) }
  saveSession(nextSession)
  return nextSession
}

async function getValidSession() {
  let session = getSession()
  if (!session) return null

  if (session.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
    try {
      session = await refreshSession(session)
    } catch {
      saveSession(null)
      return null
    }
  }
  return session
}

export const supabase = {
  getSession,
  async signIn(email, password) {
    const data = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    saveSession(data)
    return data
  },
  async signOut() {
    const session = await getValidSession()
    if (session?.access_token) {
      await request('/auth/v1/logout', { method: 'POST' }, session.access_token).catch(() => {})
    }
    saveSession(null)
  },
  async getUser() {
    const session = await getValidSession()
    if (!session?.access_token) return null
    return request('/auth/v1/user', {}, session.access_token)
  },
  async select(table, query = '') {
    const session = await getValidSession()
    return request(`/rest/v1/${table}?select=*${query}`, {}, session?.access_token)
  },
  async insert(table, values) {
    const session = await getValidSession()
    return request(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(values),
    }, session?.access_token)
  },
  async update(table, id, values) {
    const session = await getValidSession()
    return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(values),
    }, session?.access_token)
  },
  async remove(table, id) {
    const session = await getValidSession()
    return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }, session?.access_token)
  },
  async uploadVideoCover(file) {
    const session = await getValidSession()
    if (!session?.access_token) throw new Error('برای آپلود کاور باید دوباره وارد حساب مدیر شوید.')

    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file.type]
    if (!extension) throw new Error('فرمت تصویر پشتیبانی نمی‌شود.')
    if (file.size > 5 * 1024 * 1024) throw new Error('حجم تصویر بیشتر از ۵ مگابایت است.')

    const path = `covers/${crypto.randomUUID()}.${extension}`
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/video-covers/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': file.type,
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: file,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.message || result?.error || 'آپلود تصویر انجام نشد. دسترسی Storage را بررسی کنید.')
    }

    return `${SUPABASE_URL}/storage/v1/object/public/video-covers/${path}`
  },
}
