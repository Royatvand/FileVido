# MCP clients: Claude, Grok, and Gemini

Chart Masters exposes one shared, read-only remote MCP server. This guide intentionally covers **Claude, Grok, and Gemini only**. ChatGPT is not part of this integration plan.

## Shared endpoint

- MCP URL: `https://chartmasters.top/api/mcp`
- Protected-resource metadata: `https://chartmasters.top/.well-known/oauth-protected-resource/api/mcp`
- OAuth authorization server: the existing Supabase Auth project used by Chart Masters
- Consent page: `https://chartmasters.top/oauth/consent`

Do not create separate MCP servers or copy user access tokens into a connector's fixed headers. Use the browser-based OAuth authorization-code flow with PKCE and the Supabase OAuth server. Do not put a service-role key or client secret in this repository.

## Claude

1. Open Claude → **Customize → Connectors**.
2. Choose **Add custom connector** and enter the MCP URL above.
3. Review the detected authentication configuration. Choose sign-in/OAuth rather than no-auth.
4. For OAuth client identification, first try **Use Claude's published identity** or **Register automatically** if offered and accepted by the Supabase OAuth server.
5. If Claude requires a manually registered OAuth client, register it in the Supabase OAuth Apps configuration and add Claude's exact callback URI shown by Claude. The currently documented callback for a manually configured Claude web connector is `https://claude.ai/api/mcp/auth_callback`; use the exact URI displayed in your Claude UI if it differs.
6. Complete sign-in at Chart Masters and approve the requested scopes.

Remote connectors are supported in Claude Free, Pro, Max, Ultra, Team, and Enterprise; Free is limited to one custom connector. Claude's cloud connector must reach the endpoint over public HTTPS on port 443.

## Grok

1. Open [grok.com/connectors](https://grok.com/connectors).
2. Choose **New Connector → Custom**.
3. Enter `https://chartmasters.top/api/mcp`.
4. Complete the authentication method Grok detects/offers. Use OAuth sign-in through Supabase; do not paste a personal Supabase access token as a permanent header.
5. Finish the Chart Masters consent flow and confirm that Grok discovers the read-only tools.

Grok's custom MCP connector requires a publicly reachable server. For Grok Business/Enterprise, an administrator may need to provision the connector first.

## Gemini

There are two relevant routes:

### Developer Mode (best for integration testing)

1. Open [Gemini Apps Developer Mode](https://gemini.google.com/devmode).
2. Create a new custom MCP app and enter `https://chartmasters.top/api/mcp`.
3. In the Authentication tab, select **Dynamic Client Registration** if the Supabase OAuth server supports the negotiation; otherwise select **Manual Client Registration** and enter the OAuth client credentials registered in Supabase.
4. Save, connect, and verify that the available actions list contains the Chart Masters tools.
5. Test a public catalogue tool and an authenticated personal-data tool. Confirm the latter uses the signed-in user's own account.

Google's Developer Mode documentation describes both dynamic and manual client registration. Do not assume a manual client secret exists until one has actually been created in Supabase.

### Gemini Apps custom connected app

Google's consumer help currently lists eligibility restrictions for custom apps, including personal Google accounts, age 18+, English, and US availability. If the feature is not visible for your account/region, use Developer Mode for technical testing or wait for regional rollout; do not treat that as a server failure.

## Tools and permissions

The server currently exposes six read-only tools:

- `search_videos`
- `list_courses`
- `list_indicators`
- `get_my_learning_progress`
- `get_my_activity_heatmap`
- `list_my_favorites`

The first three read published catalogue content. The last three require the user's OAuth bearer token and rely on Supabase RLS. There are no write/admin tools.

## Validation checklist

For each client, record the result separately:

- [ ] OAuth discovery / client registration succeeds.
- [ ] Browser consent page opens and returns to the client.
- [ ] `tools/list` returns the six expected tools.
- [ ] `search_videos` returns only published videos.
- [ ] An authenticated personal-data tool returns the signed-in test user's data.
- [ ] A second test account cannot read the first account's private data.
- [ ] Disconnecting/revoking access prevents further authenticated calls.

A connector is **not considered ready** until all applicable checks pass in that client. The same MCP endpoint can serve all three clients, but each provider's OAuth registration and actual connection must be tested independently.
