import { createHash } from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRIVATE_PATH = /^\/(admin|login|oauth|dashboard)(\/|$)/i

function send(res, status, body) {
  return res.status(status).json(body)
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true

  let originHost
  try {
    originHost = new URL(origin).host.toLowerCase()
  } catch {
    return false
  }

  const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0].trim().toLowerCase()
  const allowedHosts = new Set([requestHost])
  try {
    if (process.env.APP_BASE_URL) allowedHosts.add(new URL(process.env.APP_BASE_URL).host.toLowerCase())
  } catch {
    // Ignore an invalid optional APP_BASE_URL; the request-host check still applies.
  }
  allowedHosts.add('chartmasters.top')
  allowedHosts.add('www.chartmasters.top')
  return allowedHosts.has(originHost)
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0]
  return String(value || req.headers['x-real-ip'] || '').trim()
}

function getDeviceType(value) {
  return ['desktop', 'mobile', 'tablet'].includes(value) ? value : 'unknown'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { message: 'Method not allowed' })
  }

  if (!isAllowedOrigin(req)) return send(res, 403, { message: 'Forbidden origin' })
  if (!SUPABASE_URL || !SERVICE_ROLE) return send(res, 503, { message: 'Analytics is not configured' })

  const contentLength = Number(req.headers['content-length'] || 0)
  if (contentLength > 4096) return send(res, 413, { message: 'Payload too large' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return send(res, 400, { message: 'Invalid payload' })
  }

  const visitorId = String(body.visitor_id || '')
  const sessionId = String(body.session_id || '')
  const path = String(body.path || '')
  if (!UUID_PATTERN.test(visitorId) || !UUID_PATTERN.test(sessionId)
      || !path.startsWith('/') || path.startsWith('//')
      || path.includes('?') || path.includes('#') || path.length > 300
      || PRIVATE_PATH.test(path)) {
    return send(res, 400, { message: 'Invalid analytics event' })
  }

  const ip = getClientIp(req)
  if (!ip) return send(res, 400, { message: 'Client address unavailable' })
  const ipHash = createHash('sha256').update(SERVICE_ROLE + ':' + ip).digest('hex')

  const rawReferrer = String(body.referrer_host || '').trim().toLowerCase()
  const referrerHost = /^[a-z0-9.-]{1,253}$/.test(rawReferrer) ? rawReferrer : ''

  try {
    const upstream = await fetch(SUPABASE_URL + '/rest/v1/rpc/record_site_pageview', {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: 'Bearer ' + SERVICE_ROLE,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_path: path,
        p_referrer_host: referrerHost,
        p_device_type: getDeviceType(body.device_type),
        p_ip_hash: ipHash,
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!upstream.ok) {
      console.error('Analytics insert failed:', upstream.status)
      return send(res, 502, { message: 'Analytics temporarily unavailable' })
    }

    const accepted = await upstream.json().catch(() => false)
    return send(res, 202, { accepted: accepted === true })
  } catch (error) {
    console.error('Analytics request failed:', error?.name || 'UnknownError')
    return send(res, 502, { message: 'Analytics temporarily unavailable' })
  }
}
