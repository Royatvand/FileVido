# MCP clients: Claude, Grok, and Gemini

Chart Masters uses one shared, read-only remote MCP endpoint. This integration scope includes **Claude, Grok, and Gemini only**.

## Shared server

- MCP URL: `https://chartmasters.top/api/mcp`
- Protected-resource metadata: `https://chartmasters.top/.well-known/oauth-protected-resource/api/mcp`
- OAuth issuer: the Supabase Auth project already used by Chart Masters
- User-consent page: `https://chartmasters.top/oauth/consent`

All clients must use browser-based OAuth authorization-code flow with PKCE. Never configure a user's access token as a permanent request header. Never expose a Supabase service-role key.

## Supabase setup (one time)

In Supabase Dashboard → **Authentication → OAuth Server**:

1. Enable the OAuth 2.1 server.
2. Set Authorization Path to `/oauth/consent`.
3. Enable **Dynamic Client Registration (DCR)** so supported MCP clients can register themselves. Keep explicit user approval enabled.
4. Keep the existing Google/GitHub sign-in providers enabled.
5. Confirm the project's Site URL is `https://chartmasters.top`.
6. Prefer asymmetric JWT signing (RS256 or ES256), especially when `openid` is requested.

DCR is the simplest setup because it avoids registering each AI client manually. If a client cannot use DCR, use that client's manual-registration option and register its exact redirect URL in Supabase OAuth Apps.

## Claude

1. Open **Claude → Customize → Connectors → Add custom connector**.
2. Enter `https://chartmasters.top/api/mcp` and continue.
3. Review the authentication Claude detects. Choose **Sign in now** or **Sign in when needed**, not No sign-in.
4. Under **OAuth client**, choose **Register automatically** when Supabase DCR is enabled.
5. Complete the Chart Masters sign-in and approve the scopes on the Chart Masters consent page.

**Manual fallback:** Choose **Use your own OAuth client** only if automatic registration is unavailable or fails. Create an OAuth client in Supabase OAuth Apps, then register the exact redirect URL shown by Claude. The current Claude web connector callback documented by Anthropic is `https://claude.ai/api/mcp/auth_callback`. Enter the Client ID and, only if Supabase issued one, its Client Secret in Claude. Never put a secret in this repository.

Claude's official setup offers three OAuth client modes: published identity, automatic registration, and your own client. This guide uses automatic registration as the default because the Supabase MCP integration supports DCR.

## Grok

1. Open [grok.com/connectors](https://grok.com/connectors).
2. Choose **New Connector → Custom** (or the equivalent **Other** option shown in your account).
3. Enter `https://chartmasters.top/api/mcp`.
4. Complete the authentication method the Grok UI requests. Use its OAuth sign-in / registration flow when available; the authorization server is the Chart Masters Supabase project.
5. Finish the consent flow and verify Grok discovers the Chart Masters tools.

Grok requires the MCP server to be reachable over the public internet. For Grok Business or Enterprise workspaces, a team administrator may need to provision the connector before members can use it. xAI's public Custom Connector documentation describes adding the server URL and completing any required authentication; it does not guarantee that every OAuth client-registration mode is available in every account UI. If Grok presents a manual OAuth client option, register the exact redirect URI displayed there in Supabase OAuth Apps.

## Gemini Apps Developer Mode

Use Developer Mode for the integration test:

1. Open [Gemini Apps Developer Mode](https://gemini.google.com/devmode).
2. Create a custom MCP app and enter `https://chartmasters.top/api/mcp`.
3. Open the **Authentication** tab.
4. Select **Dynamic Client Registration** when DCR is enabled in Supabase.
5. If you choose **Manual Client Registration**, first create a client in Supabase OAuth Apps, then enter the issued Client ID and Client Secret in Gemini. Configure any additional flow overrides only when the UI requires them.
6. Save, wait for the Saved confirmation, then run a test prompt and verify the authenticated tools succeed.

Google documents both DCR and manual client registration in the Developer Mode authentication panel. Consumer Gemini custom connected apps can have separate account, language, and regional eligibility restrictions; Developer Mode is the technical route for testing this MCP server.

## Available tools and access model

The server exposes six read-only tools:

- `search_videos` — search published videos
- `list_courses` — list published courses and lessons
- `list_indicators` — list published indicators
- `get_my_learning_progress` — read the signed-in user's learning progress
- `get_my_activity_heatmap` — read the signed-in user's 365-day activity summary
- `list_my_favorites` — read the signed-in user's saved videos

The first three tools return published catalogue content. The last three require the user's OAuth bearer token and rely on Supabase Row Level Security (RLS). No write or admin tools are exposed.

## Verification checklist for each client

- [ ] OAuth metadata discovery succeeds.
- [ ] OAuth registration and PKCE authorization complete.
- [ ] The browser reaches the Chart Masters consent page and returns to the client.
- [ ] The client lists all six expected tools.
- [ ] A catalogue tool returns published content only.
- [ ] A personal-data tool returns data for the signed-in test account.
- [ ] A second test account cannot read the first account's personal data.
- [ ] Revoking/disconnecting access prevents further authenticated calls.

Do not mark a client as connected until its own authorization and tool-call tests pass. The three clients share the same server endpoint, but each provider's OAuth flow must be verified separately.
