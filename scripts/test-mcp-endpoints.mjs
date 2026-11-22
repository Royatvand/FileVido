const baseValue = process.env.MCP_BASE_URL

if (!baseValue) {
  console.error('Set MCP_BASE_URL to the exact public or Vercel Preview origin before running this test.')
  process.exit(1)
}

const baseUrl = new URL(baseValue)
if (baseUrl.protocol !== 'https:') {
  throw new Error('MCP_BASE_URL must use HTTPS.')
}

const origin = baseUrl.origin
const metadataUrl = new URL('/.well-known/oauth-protected-resource/api/mcp', origin)
const mcpUrl = new URL('/api/mcp', origin)
const requestHeaders = {
  Origin: 'https://claude.ai',
  'Access-Control-Request-Method': 'POST',
  'Access-Control-Request-Headers': 'authorization,content-type,mcp-protocol-version,mcp-session-id',
}

async function request(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  })
  return response
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const metadataResponse = await request(metadataUrl)
  assert(metadataResponse.status === 200, `Metadata GET returned HTTP ${metadataResponse.status}`)
  assert(metadataResponse.headers.get('access-control-allow-origin') === '*', 'Metadata GET is missing CORS allow-origin.')

  const metadata = await metadataResponse.json()
  assert(metadata.resource === mcpUrl.toString(), `Metadata resource does not match this origin: ${metadata.resource}`)
  assert(Array.isArray(metadata.authorization_servers) && metadata.authorization_servers.length > 0, 'No OAuth authorization server was advertised.')
  assert(metadata.authorization_servers.every((url) => url.endsWith('/auth/v1')), 'Unexpected Supabase OAuth issuer URL.')
  assert(['openid', 'email', 'profile'].every((scope) => metadata.scopes_supported?.includes(scope)), 'One or more expected OAuth scopes are missing.')

  const metadataPreflight = await request(metadataUrl, { method: 'OPTIONS', headers: requestHeaders })
  assert(metadataPreflight.status === 204, `Metadata OPTIONS returned HTTP ${metadataPreflight.status}`)
  assert(metadataPreflight.headers.get('access-control-allow-origin') === '*', 'Metadata OPTIONS is missing CORS allow-origin.')
  assert(metadataPreflight.headers.get('access-control-allow-methods')?.includes('GET'), 'Metadata OPTIONS does not allow GET.')

  const mcpPreflight = await request(mcpUrl, { method: 'OPTIONS', headers: requestHeaders })
  assert(mcpPreflight.status === 204, `MCP OPTIONS returned HTTP ${mcpPreflight.status}`)
  assert(mcpPreflight.headers.get('access-control-allow-origin') === '*', 'MCP OPTIONS is missing CORS allow-origin.')
  const allowedHeaders = mcpPreflight.headers.get('access-control-allow-headers')?.toLowerCase() || ''
  assert(['authorization', 'content-type', 'mcp-protocol-version', 'mcp-session-id'].every((header) => allowedHeaders.includes(header)), 'MCP OPTIONS is missing one or more required request headers.')

  const unauthenticated = await request(mcpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'chartmasters-mcp-smoke-test', version: '1.0.0' },
      },
    }),
  })
  assert(unauthenticated.status === 401, `Unauthenticated MCP request returned HTTP ${unauthenticated.status}, expected 401`)
  const challenge = unauthenticated.headers.get('www-authenticate') || ''
  assert(challenge.includes(metadataUrl.toString()), '401 challenge does not point to this origin\'s protected-resource metadata.')
  assert(unauthenticated.headers.get('access-control-allow-origin') === '*', '401 response is missing CORS allow-origin.')

  console.log('PASS protected-resource metadata GET')
  console.log('PASS metadata CORS preflight')
  console.log('PASS MCP CORS preflight')
  console.log('PASS unauthenticated MCP request returns 401 + discovery challenge')
  console.log('Smoke tests passed. OAuth login and authenticated tool calls still require an interactive client test.')
}

main().catch((error) => {
  console.error(`MCP smoke test failed: ${error.message}`)
  process.exitCode = 1
})
