const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  })
}

export default function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, OPTIONS',
        ...CORS_HEADERS,
      },
    })
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, { Allow: 'GET, OPTIONS' })
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  if (!supabaseUrl) {
    return jsonResponse({ error: 'Supabase URL is not configured.' }, 503)
  }

  return jsonResponse({
    resource: 'https://chartmasters.top/api/mcp',
    authorization_servers: [`${supabaseUrl}/auth/v1`],
    scopes_supported: ['openid', 'email', 'profile'],
    bearer_methods_supported: ['header'],
  })
}
