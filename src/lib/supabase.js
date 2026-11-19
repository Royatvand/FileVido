import { compressImage } from './imageCompress'
import { PLAYLIST_FILE_MAX_BYTES } from './playlistFiles'
import { INDICATOR_EXTENSIONS, INDICATOR_MAX_BYTES, getIndicatorExtension } from './indicators'

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

// هر ۵۰ شناسه (حدود ۲ کیلوبایت آدرس) یک درخواست
const ID_CHUNK_SIZE = 50

function chunkList(list, size) {
  const chunks = []
  for (let index = 0; index < list.length; index += size) chunks.push(list.slice(index, index + size))
  return chunks
}

const USER_SESSION_KEY = 'chartmasters_user_session'
const USER_CODE_VERIFIER_KEY = 'chartmasters_google_code_verifier'

function getUserSession() {
  try {
    return JSON.parse(localStorage.getItem(USER_SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function saveUserSession(session) {
  if (session) {
    const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600)
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify({ ...session, expires_at: expiresAt }))
  } else {
    localStorage.removeItem(USER_SESSION_KEY)
  }
}

function encodeBase64Url(bytes) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function createCodeChallenge(verifier) {
  const bytes = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return encodeBase64Url(new Uint8Array(digest))
}

async function refreshUserSession(session) {
  if (!session?.refresh_token) return null
  const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  saveUserSession(refreshed)
  return getUserSession()
}

async function getValidUserSession() {
  let session = getUserSession()
  if (!session) return null

  if (session.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
    try {
      session = await refreshUserSession(session)
    } catch {
      saveUserSession(null)
      return null
    }
  }
  return session
}


// Device metadata is descriptive only; authorization is always enforced by Supabase RLS.
const USER_DEVICE_KEY = 'chartmasters_device_key'

function getJwtClaims(token) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function getCurrentDeviceKey() {
  let key = localStorage.getItem(USER_DEVICE_KEY)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(USER_DEVICE_KEY, key)
  }
  return key
}

function getDeviceMetadata() {
  const ua = navigator.userAgent || ''
  const platform = navigator.userAgentData?.platform || navigator.platform || ''
  const deviceType = /ipad|tablet|kindle|playbook/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
    ? 'tablet'
    : /android|iphone|ipod|mobile/i.test(ua)
      ? 'mobile'
      : 'desktop'

  let operatingSystem = 'سیستم‌عامل نامشخص'
  if (/android/i.test(ua)) operatingSystem = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) operatingSystem = 'iOS'
  else if (/windows/i.test(platform + ua)) operatingSystem = 'Windows'
  else if (/mac/i.test(platform + ua)) operatingSystem = 'macOS'
  else if (/cros/i.test(ua)) operatingSystem = 'ChromeOS'
  else if (/linux/i.test(platform + ua)) operatingSystem = 'Linux'

  let browser = 'مرورگر نامشخص'
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge'
  else if (/opr\//i.test(ua)) browser = 'Opera'
  else if (/firefox\//i.test(ua)) browser = 'Firefox'
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome'
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari'

  const typeLabel = deviceType === 'mobile' ? 'موبایل' : deviceType === 'tablet' ? 'تبلت' : 'کامپیوتر'
  return {
    device_key: getCurrentDeviceKey(),
    device_label: typeLabel + ' · ' + operatingSystem,
    device_type: deviceType,
    browser,
    operating_system: operatingSystem,
  }
}

async function registerDeviceSession(session) {
  if (!session?.access_token || !session?.user?.id) return null
  const claims = getJwtClaims(session.access_token)
  if (!claims?.session_id) return null
  const now = new Date().toISOString()
  const metadata = getDeviceMetadata()
  const rows = await request('/rest/v1/user_device_sessions?on_conflict=session_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: session.user.id,
      session_id: claims.session_id,
      ...metadata,
      last_seen_at: now,
    }),
  }, session.access_token)
  return rows?.[0] || null
}

// احراز هویت کاربران عادی؛ نشست آن کاملاً جدا از نشست پنل مدیریت است.
let googleCallbackPromise = null
const USER_NEXT_KEY = 'chartmasters_login_next'

// فقط مسیرهای داخلی سایت پذیرفته می‌شود (جلوگیری از open redirect)
export function safeNextPath(value) {
  if (typeof value !== 'string') return ''
  return /^\/(?![/\\])[^\s]*$/.test(value) && !value.startsWith('/login') ? value : ''
}

export const userAuth = {
  getSession: getUserSession,
  rememberNext(value) {
    const next = safeNextPath(value)
    try { if (next) sessionStorage.setItem(USER_NEXT_KEY, next) } catch { /* ذخیره نشد؛ به داشبورد می‌رود */ }
  },
  consumeNext() {
    try {
      const next = safeNextPath(sessionStorage.getItem(USER_NEXT_KEY) || '')
      sessionStorage.removeItem(USER_NEXT_KEY)
      return next
    } catch { return '' }
  },
  async getValidSession() {
    return getValidUserSession()
  },
  async fetchCurrentUser() {
    const session = await getValidUserSession()
    if (!session?.access_token) return null
    const user = await request('/auth/v1/user', {}, session.access_token)
    const current = getUserSession()
    if (current && user?.id) saveUserSession({ ...current, user })
    return user
  },
  async registerCurrentDevice() {
    return registerDeviceSession(await getValidUserSession())
  },
  async getDeviceSessions() {
    const session = await getValidUserSession()
    if (!session?.access_token) throw new Error('برای مشاهده دستگاه‌های متصل ابتدا وارد حساب کاربری شو.')
    const claims = getJwtClaims(session.access_token)
    const rows = await request(
      '/rest/v1/user_device_sessions?select=id,session_id,device_key,device_label,device_type,browser,operating_system,created_at,last_seen_at&order=last_seen_at.desc',
      {},
      session.access_token,
    )
    return (rows || []).map((device) => ({ ...device, is_current: device.session_id === claims?.session_id }))
  },
  async touchCurrentDevice() {
    const session = await getValidUserSession()
    if (!session?.access_token) return null
    const claims = getJwtClaims(session.access_token)
    if (!claims?.session_id) return null
    const rows = await request(
      '/rest/v1/user_device_sessions?session_id=eq.' + encodeURIComponent(claims.session_id),
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ last_seen_at: new Date().toISOString() }) },
      session.access_token,
    )
    if (!rows?.length) return registerDeviceSession(session)
    return rows[0]
  },
  async signOutOtherDevices() {
    const session = await getValidUserSession()
    if (!session?.access_token || !session?.user?.id) throw new Error('نشست کاربری معتبر نیست؛ دوباره وارد حساب شو.')
    const claims = getJwtClaims(session.access_token)
    if (!claims?.session_id) throw new Error('شناسه نشست فعلی پیدا نشد؛ دوباره وارد حساب شو.')
    await request('/auth/v1/logout?scope=others', { method: 'POST' }, session.access_token)
    await request(
      '/rest/v1/user_device_sessions?user_id=eq.' + encodeURIComponent(session.user.id) + '&session_id=neq.' + encodeURIComponent(claims.session_id),
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
      session.access_token,
    )
    return true
  },
  async signInWithGoogle() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('تنظیمات اتصال Supabase در محیط پروژه وارد نشده است.')
    }

    const randomBytes = crypto.getRandomValues(new Uint8Array(32))
    const verifier = encodeBase64Url(randomBytes)
    const challenge = await createCodeChallenge(verifier)
    sessionStorage.setItem(USER_CODE_VERIFIER_KEY, verifier)

    const authorizeUrl = new URL('/auth/v1/authorize', SUPABASE_URL)
    authorizeUrl.searchParams.set('provider', 'google')
    authorizeUrl.searchParams.set('redirect_to', window.location.origin + '/login')
    authorizeUrl.searchParams.set('code_challenge', challenge)
    authorizeUrl.searchParams.set('code_challenge_method', 's256')
    window.location.assign(authorizeUrl.toString())
  },
  async updateProfile(profile) {
    const session = await getValidUserSession()
    if (!session?.access_token) throw new Error('برای ویرایش پروفایل ابتدا وارد حساب کاربری شو.')
    const result = await request('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({ data: profile }),
    }, session.access_token)
    const current = getUserSession()
    if (current) saveUserSession({ ...current, user: result })
    return result
  },
  async signOut() {
    const session = await getValidUserSession()
    if (session?.access_token) {
      const claims = getJwtClaims(session.access_token)
      if (claims?.session_id) {
        await request(
          '/rest/v1/user_device_sessions?session_id=eq.' + encodeURIComponent(claims.session_id),
          { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
          session.access_token,
        ).catch(() => {})
      }
      await request('/auth/v1/logout?scope=local', { method: 'POST' }, session.access_token).catch(() => {})
    }
    saveUserSession(null)
  },
  async completeGoogleSignIn(code) {
    if (googleCallbackPromise) return googleCallbackPromise
    googleCallbackPromise = (async () => {
      const verifier = sessionStorage.getItem(USER_CODE_VERIFIER_KEY)
      if (!code || !verifier) {
        throw new Error('نشست ورود معتبر نیست. لطفاً دوباره با گوگل وارد شوید.')
      }

      const session = await request('/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      })

      sessionStorage.removeItem(USER_CODE_VERIFIER_KEY)
      saveUserSession(session)
      await registerDeviceSession(getUserSession()).catch(() => {})
      return getUserSession()
    })()
    try {
      return await googleCallbackPromise
    } finally {
      googleCallbackPromise = null
    }
  }
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
  async select(table, query = '', columns = '*') {
    const session = await getValidSession()
    return request(`/rest/v1/${table}?select=${columns}${query}`, {}, session?.access_token)
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
  async updateWhere(table, filters, values) {
    const session = await getValidSession()
    return request(`/rest/v1/${table}?${filters}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(values) }, session?.access_token)
  },
  async replaceVideoPlaylists(videoId, playlistIds = []) {
    const session = await getValidSession()
    const token = session?.access_token
    if (!token) throw new Error('برای مدیریت پلی‌لیست‌ها باید وارد حساب مدیر شوید.')
    const currentRows = await request(`/rest/v1/playlist_videos?select=playlist_id,position&video_id=eq.${encodeURIComponent(videoId)}`, {}, token)
    const selectedIds = [...new Set(playlistIds)]
    const positions = new Map((currentRows || []).map((item) => [item.playlist_id, item.position]))
    const nextPositions = new Map()
    if (selectedIds.length) {
      const existingRows = await request(`/rest/v1/playlist_videos?select=playlist_id,position&playlist_id=in.(${selectedIds.join(',')})`, {}, token)
      for (const item of existingRows || []) {
        const next = Math.max(nextPositions.get(item.playlist_id) || 0, Number(item.position) + 1)
        nextPositions.set(item.playlist_id, next)
      }
    }
    await request(`/rest/v1/playlist_videos?video_id=eq.${encodeURIComponent(videoId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, token)
    if (selectedIds.length) {
      const rows = selectedIds.map((playlist_id) => ({ playlist_id, video_id: videoId, position: positions.has(playlist_id) ? positions.get(playlist_id) : (nextPositions.get(playlist_id) || 0) }))
      await request('/rest/v1/playlist_videos', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) }, token)
    }
  },
  async uploadVideoCover(file) {
    const session = await getValidSession()
    if (!session?.access_token) throw new Error('برای آپلود کاور باید دوباره وارد حساب مدیر شوید.')

    if (!({ 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1 })[file.type]) throw new Error('فرمت تصویر پشتیبانی نمی‌شود.')
    if (file.size > 5 * 1024 * 1024) throw new Error('حجم تصویر بیشتر از ۵ مگابایت است.')

    // قبل از آپلود کوچک و به WebP تبدیل می‌شود تا صفحه‌ها سریع‌تر باز شوند
    const { blob, type } = await compressImage(file)
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[type]

    const path = `covers/${crypto.randomUUID()}.${extension}`
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/video-covers/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': type,
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: blob,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.message || result?.error || 'آپلود تصویر انجام نشد. دسترسی Storage را بررسی کنید.')
    }

    return `${SUPABASE_URL}/storage/v1/object/public/video-covers/${path}`
  },
  // آپلود فایل اسکریپت یا اندیکاتور؛ مسیر فایل در bucket برمی‌گردد (نه آدرس کامل)
  async uploadPlaylistFile(file) {
    const session = await getValidSession()
    if (!session?.access_token) throw new Error('برای آپلود فایل باید دوباره وارد حساب مدیر شوید.')
    if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('نام فایل باید پسوند PDF داشته باشد.')
    if (file.size > PLAYLIST_FILE_MAX_BYTES) throw new Error('حجم فایل بیشتر از ۲۰ مگابایت است.')
    const signature = await file.slice(0, 5).text()
    if (signature !== '%PDF-') throw new Error('محتوای فایل معتبر PDF نیست.')

    const path = `files/${crypto.randomUUID()}.pdf`
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/playlist-files/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/pdf',
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: file,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.message || result?.error || 'آپلود PDF انجام نشد. SQL فایل supabase/playlist-files.sql اجرا شده است؟')
    return path
  },
  async createPlaylistFileSignedUrl(path, fileName) {
    if (!path) throw new Error('مسیر فایل PDF مشخص نیست.')
    const session = await getValidSession()
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(SUPABASE_URL + '/storage/v1/object/sign/playlist-files/' + encodedPath, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {}),
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.message || result?.error || 'ساخت لینک دانلود PDF انجام نشد.')
    const signedUrl = result?.signedURL || result?.signedUrl
    if (!signedUrl) throw new Error('لینک دانلود PDF از Storage دریافت نشد.')
    const absoluteUrl = signedUrl.startsWith('http')
      ? signedUrl
      : SUPABASE_URL + '/storage/v1' + (signedUrl.startsWith('/') ? signedUrl : '/' + signedUrl)
    const downloadUrl = new URL(absoluteUrl)
    downloadUrl.searchParams.set('download', fileName || 'true')
    return downloadUrl.toString()
  },
  async removePlaylistFile(path) {
    const session = await getValidSession()
    if (!session?.access_token || !path) return
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(SUPABASE_URL + '/storage/v1/object/playlist-files/' + encodedPath, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + session.access_token },
    })
    if (!response.ok && response.status !== 404) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.message || result?.error || 'حذف فایل PDF از Storage انجام نشد.')
    }
  },
  async uploadIndicatorFile(file) {
    const session = await getValidSession()
    if (!session?.access_token) throw new Error('برای آپلود فایل باید دوباره وارد حساب مدیر شوید.')
    const extension = getIndicatorExtension(file.name)
    if (!INDICATOR_EXTENSIONS.includes(extension)) throw new Error(`فرمت فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: ${INDICATOR_EXTENSIONS.join('، ')}`)
    if (file.size > INDICATOR_MAX_BYTES) throw new Error('حجم فایل بیشتر از ۱۰ مگابایت است.')

    const path = `files/${crypto.randomUUID()}.${extension}`
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/indicator-files/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: file,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.message || result?.error || 'آپلود فایل انجام نشد. SQL فایل supabase/indicators.sql اجرا شده است؟')
    }
    return path
  },
  async removeIndicatorFile(path) {
    const session = await getValidSession()
    if (!session?.access_token || !path) return
    await fetch(`${SUPABASE_URL}/storage/v1/object/indicator-files/${path}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {})
  },
  async uploadIndicatorImage(file) {
    const session = await getValidSession()
    if (!session?.access_token) throw new Error('برای آپلود تصاویر باید دوباره وارد حساب مدیر شوید.')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('فقط تصویر JPG، PNG یا WEBP مجاز است.')
    if (file.size > 5 * 1024 * 1024) throw new Error('حجم هر تصویر باید حداکثر ۵ مگابایت باشد.')

    const { blob, type } = await compressImage(file)
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[type]
    const path = `images/${crypto.randomUUID()}.${extension}`
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/indicator-images/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': type,
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: blob,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.message || result?.error || 'آپلود تصویر گالری انجام نشد؛ تنظیمات Storage را بررسی کن.')
    return path
  },
  async removeIndicatorImageFile(path) {
    const session = await getValidSession()
    if (!session?.access_token || !path) return
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/indicator-images/${path}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.message || result?.error || 'حذف تصویر از Storage انجام نشد.')
    }
  },
  // شمارندهٔ دانلود؛ شکستش نباید جلوی دانلود را بگیرد
  async countIndicatorDownload(slug) {
    try {
      await request('/rest/v1/rpc/increment_indicator_downloads', { method: 'POST', body: JSON.stringify({ p_slug: slug }) })
    } catch {
      // نادیده گرفته می‌شود
    }
  },
}

 
// User learning data uses the Google user session; database RLS isolates every account.
export const userLearning = {
  async getVideoStatus(videoId) {
    const session = await getValidUserSession()
    if (!session?.access_token || !videoId) return { isFavorite: false, progress: null }
    const [favorites, progress] = await Promise.all([
      request('/rest/v1/user_favorites?select=id&video_id=eq.' + encodeURIComponent(videoId) + '&limit=1', {}, session.access_token),
      request('/rest/v1/user_video_progress?select=id,is_completed,completed_at,last_watched_at&video_id=eq.' + encodeURIComponent(videoId) + '&limit=1', {}, session.access_token),
    ])
    return { isFavorite: Boolean(favorites?.length), progress: progress?.[0] || null }
  },

  async addHistory(videoId) {
    const session = await getValidUserSession()
    if (!session?.access_token || !session.user?.id) return null
    const rows = await request('/rest/v1/user_video_progress?on_conflict=user_id,video_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: session.user.id, video_id: videoId, last_watched_at: new Date().toISOString() }),
    }, session.access_token)
    return rows?.[0] || null
  },

  async setFavorite(videoId, shouldFavorite) {
    const session = await getValidUserSession()
    if (!session?.access_token || !session.user?.id) throw new Error('برای ذخیره علاقه‌مندی ابتدا وارد حساب کاربری شو.')
    if (shouldFavorite) {
      await request('/rest/v1/user_favorites?on_conflict=user_id,video_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: session.user.id, video_id: videoId }),
      }, session.access_token)
    } else {
      await request('/rest/v1/user_favorites?user_id=eq.' + session.user.id + '&video_id=eq.' + encodeURIComponent(videoId), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      }, session.access_token)
    }
    return shouldFavorite
  },

  async setCompleted(videoId, completed) {
    const session = await getValidUserSession()
    if (!session?.access_token || !session.user?.id) throw new Error('برای ثبت پیشرفت ابتدا وارد حساب کاربری شو.')
    await this.addHistory(videoId)
    await request('/rest/v1/user_video_progress?user_id=eq.' + session.user.id + '&video_id=eq.' + encodeURIComponent(videoId), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }),
    }, session.access_token)
    return completed
  },

  async getDashboardData() {
    const session = await getValidUserSession()
    if (!session?.access_token) throw new Error('برای مشاهده داشبورد ابتدا وارد حساب کاربری شو.')
    const token = session.access_token
    const [progress, favorites] = await Promise.all([
      request('/rest/v1/user_video_progress?select=id,last_watched_at,is_completed,completed_at,videos(id,slug,title,cover_url,duration)&order=last_watched_at.desc&limit=1000', {}, token),
      request('/rest/v1/user_favorites?select=id,created_at,videos(id,slug,title,cover_url,duration)&order=created_at.desc&limit=1000', {}, token),
    ])

    const videoIds = [...new Set((progress || []).map((item) => item.videos?.id).filter(Boolean))]
    let courses = []
    if (videoIds.length) {
      // آدرس درخواست محدودیت طول دارد؛ شناسه‌ها را دسته‌های کوچک می‌فرستیم تا برای کاربر پرفعالیت خطا ندهد
      const viewedMemberships = (await Promise.all(chunkList(videoIds, ID_CHUNK_SIZE).map((ids) => request(
        '/rest/v1/playlist_videos?select=playlist_id,video_id,playlists(id,title,cover_url,status)&video_id=in.(' + ids.join(',') + ')',
        {},
        token,
      )))).flat()
      const courseIds = [...new Set((viewedMemberships || [])
        .filter((item) => item.playlists?.status === 'published')
        .map((item) => item.playlist_id))]
      if (courseIds.length) {
        const lessonPages = await Promise.all(chunkList(courseIds, ID_CHUNK_SIZE).map((ids) => request(
          '/rest/v1/playlist_videos?select=playlist_id,video_id,position,videos(slug),playlists(id,title,cover_url,status)&order=position.asc&playlist_id=in.(' + ids.join(',') + ')',
          {},
          token,
        )))
        const allLessons = lessonPages.flat()
        const completedIds = new Set((progress || []).filter((item) => item.is_completed).map((item) => item.videos?.id))
        const courseMap = new Map()
        for (const lesson of allLessons || []) {
          const playlist = lesson.playlists
          if (!playlist || playlist.status !== 'published') continue
          if (!courseMap.has(lesson.playlist_id)) {
            courseMap.set(lesson.playlist_id, { ...playlist, totalLessons: 0, completedLessons: 0 })
          }
          const course = courseMap.get(lesson.playlist_id)
          course.totalLessons += 1
          const done = completedIds.has(lesson.video_id)
          if (done) course.completedLessons += 1
          // جلسهٔ بعدی = اولین جلسهٔ تکمیل‌نشده (ترتیب position)؛ اگر همه تمام شده‌اند، اولین جلسه برای مرور
          if (lesson.videos?.slug) {
            const entry = { slug: lesson.videos.slug, number: course.totalLessons }
            if (!course.firstLesson) course.firstLesson = entry
            if (!done && !course.pendingLesson) course.pendingLesson = entry
          }
        }
        courses = [...courseMap.values()].map(({ firstLesson, pendingLesson, ...course }) => ({
          ...course,
          nextLesson: pendingLesson || firstLesson || null,
          progressPercent: course.totalLessons ? Math.round((course.completedLessons / course.totalLessons) * 100) : 0,
        }))
      }
    }

    return {
      progress: progress || [],
      favorites: favorites || [],
      courses,
      stats: {
        courseCount: courses.length,
        viewedCount: (progress || []).length,
        completedCount: (progress || []).filter((item) => item.is_completed).length,
        favoriteCount: (favorites || []).length,
      },
    }
  },
}
