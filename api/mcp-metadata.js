export default function handler(request) {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Supabase URL is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  return new Response(JSON.stringify({
    resource: 'https://chartmasters.top/api/mcp',
    authorization_servers: [`${supabaseUrl}/auth/v1`],
    scopes_supported: ['openid', 'email', 'profile'],
    bearer_methods_supported: ['header'],
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
