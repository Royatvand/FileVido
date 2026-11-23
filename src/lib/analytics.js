const VISITOR_KEY = 'chartmasters_analytics_visitor'
const SESSION_KEY = 'chartmasters_analytics_session'
const LAST_VIEW_KEY = 'chartmasters_analytics_last_view'
const PRIVATE_PATH = /^\/(admin|login|oauth|dashboard)(\/|$)/i

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('')
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20)
}

function getStoredId(storage, key) {
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    const created = createId()
    storage.setItem(key, created)
    return created
  } catch {
    return createId()
  }
}

function getDeviceType() {
  const ua = navigator.userAgent || ''
  if (/ipad|tablet|kindle|playbook/i.test(ua)) return 'tablet'
  if (/android|iphone|ipod|mobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getExternalReferrerHost() {
  try {
    if (!document.referrer) return ''
    const host = new URL(document.referrer).hostname.toLowerCase()
    return host === window.location.hostname.toLowerCase() ? '' : host
  } catch {
    return ''
  }
}

export function trackPageView(pathname) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  const path = String(pathname || '/').split(/[?#]/, 1)[0] || '/'
  if (!path.startsWith('/') || path.startsWith('//') || PRIVATE_PATH.test(path)) return

  // React StrictMode can run mount effects twice; skip an immediate duplicate.
  try {
    const previous = JSON.parse(sessionStorage.getItem(LAST_VIEW_KEY) || 'null')
    if (previous?.path === path && Date.now() - previous.time < 3000) return
    sessionStorage.setItem(LAST_VIEW_KEY, JSON.stringify({ path, time: Date.now() }))
  } catch {
    // Continue with an event even when storage is unavailable.
  }

  const visitorId = getStoredId(localStorage, VISITOR_KEY)
  const sessionId = getStoredId(sessionStorage, SESSION_KEY)

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitor_id: visitorId,
      session_id: sessionId,
      path,
      referrer_host: getExternalReferrerHost(),
      device_type: getDeviceType(),
    }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt the page experience.
  })
}
