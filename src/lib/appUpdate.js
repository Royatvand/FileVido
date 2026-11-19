/**
 * Android-only app update management.
 * Web builds never enter this flow.
 */
import { Capacitor } from '@capacitor/core'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const DISMISSED_KEY = 'chartmasters_dismissed_version_code'
const DEVICE_KEY = 'chartmasters_device_key'

export function isAndroidNative() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  } catch {
    return false
  }
}

function getDeviceKey() {
  try {
    let key = localStorage.getItem(DEVICE_KEY)
    if (!key) {
      key = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, key)
    }
    return key
  } catch {
    return null
  }
}

export function getDismissedVersionCode() {
  try {
    const value = Number(localStorage.getItem(DISMISSED_KEY) || '0')
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export function setDismissedVersionCode(versionCode) {
  try {
    localStorage.setItem(DISMISSED_KEY, String(versionCode))
  } catch {
    /* ignore */
  }
}

async function publicRequest(path) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('تنظیمات اتصال Supabase در محیط پروژه وارد نشده است.')
  }
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
  })
  const result = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(result?.message || result?.msg || result?.hint || 'درخواست نسخه اپ با خطا مواجه شد.')
  }
  return result
}

/** Fetch the highest published version (by version_code). */
export async function fetchLatestPublishedVersion() {
  const rows = await publicRequest(
    '/rest/v1/app_versions?select=id,version_code,version_name,changelog,download_url,is_mandatory,published_at&is_published=eq.true&order=version_code.desc&limit=1',
  )
  return rows?.[0] || null
}

/** Current native app info from Capacitor App plugin. */
export async function getNativeAppInfo() {
  if (!isAndroidNative()) return null
  try {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    return {
      versionCode: Number(info.build) || 0,
      versionName: info.version || '0',
      id: info.id || '',
      name: info.name || '',
    }
  } catch (error) {
    console.warn('[appUpdate] App.getInfo failed', error)
    return null
  }
}

/**
 * Compare installed version with the latest published one.
 * Returns null when no update is needed / not on Android.
 */
export async function checkForAppUpdate() {
  if (!isAndroidNative()) return null

  const [installed, latest] = await Promise.all([
    getNativeAppInfo(),
    fetchLatestPublishedVersion(),
  ])

  if (!installed || !latest) return null
  if (latest.version_code <= installed.versionCode) return null

  // Optional updates the user already dismissed stay hidden until a newer code appears.
  if (!latest.is_mandatory && latest.version_code <= getDismissedVersionCode()) {
    return null
  }

  return {
    installed,
    latest: {
      id: latest.id,
      versionCode: latest.version_code,
      versionName: latest.version_name,
      changelog: latest.changelog || '',
      downloadUrl: latest.download_url,
      isMandatory: Boolean(latest.is_mandatory),
      publishedAt: latest.published_at,
    },
  }
}

/** Open a URL outside the Android WebView when running natively. */
export async function openExternalUrl(url) {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return
  if (isAndroidNative()) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
      return
    } catch (error) {
      console.warn('[appUpdate] Native browser unavailable', error)
    }
    window.open(url, '_system')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Register / refresh FCM token for this Android device. */
export async function registerFcmToken(token, userId = null) {
  if (!isAndroidNative() || !token || !SUPABASE_URL || !SUPABASE_KEY) return null

  const payload = {
    token,
    platform: 'android',
    device_key: getDeviceKey(),
    user_id: userId || null,
    last_seen_at: new Date().toISOString(),
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/fcm_tokens?on_conflict=token`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    },
  )

  const result = await response.json().catch(() => null)
  if (!response.ok) {
    console.warn('[appUpdate] FCM token registration failed', result)
    return null
  }
  return true
}

/** Initialize Android push notifications once per app runtime. */
let pushInitialization = null

export function initAndroidPushNotifications(userId = null) {
  if (!isAndroidNative()) return Promise.resolve()
  if (pushInitialization) return pushInitialization

  pushInitialization = (async () => {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permission = await PushNotifications.checkPermissions()
    let status = permission.receive
    if (status === 'prompt' || status === 'prompt-with-rationale') {
      const requested = await PushNotifications.requestPermissions()
      status = requested.receive
    }
    if (status !== 'granted') {
      console.info('[appUpdate] Notification permission not granted')
      pushInitialization = null
      return
    }

    // Create the channel referenced by the server's FCM notification payload.
    await PushNotifications.createChannel({
      id: 'app_updates',
      name: 'به‌روزرسانی چارت مسترز',
      description: 'اعلان نسخه‌های جدید اپلیکیشن',
      importance: 5,
      visibility: 1,
      sound: 'default',
    }).catch((error) => {
      console.warn('[appUpdate] Notification channel creation failed', error)
    })

    // Register listeners BEFORE register(); otherwise the registration event can be missed.
    await PushNotifications.addListener('registration', async (event) => {
      if (event?.value) await registerFcmToken(event.value, userId)
    })
    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('[appUpdate] Push registration error', error)
    })
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action?.notification?.data?.download_url
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        await openExternalUrl(url)
      }
    })

    await PushNotifications.register()
  })().catch((error) => {
    pushInitialization = null
    console.info('[appUpdate] Push notifications unavailable:', error?.message || error)
  })

  return pushInitialization
}

/** Listen for app resume and re-check for updates. */
export async function onAppResume(callback) {
  if (!isAndroidNative() || typeof callback !== 'function') return () => {}
  try {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appStateChange', (state) => {
      if (state.isActive) callback()
    })
    return () => {
      handle.remove()
    }
  } catch {
    return () => {}
  }
}
