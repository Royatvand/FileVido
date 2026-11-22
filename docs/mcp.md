# Chart Masters MCP

This document describes the read-only MCP server and its Supabase OAuth sign-in flow.

## Endpoint

- MCP endpoint: `https://chartmasters.top/api/mcp`
- OAuth protected-resource metadata: `https://chartmasters.top/.well-known/oauth-protected-resource/api/mcp`
- Consent screen: `https://chartmasters.top/oauth/consent`

## Architecture

Supabase Auth acts as the OAuth 2.1 authorization server. The MCP endpoint is the OAuth resource server. Existing Google and GitHub sign-in methods remain the user's identity providers; they are not replaced.

The consent UI uses the existing signed-in Chart Masters session and the Supabase JS OAuth consent methods. The MCP server validates each bearer token by calling Supabase Auth's `/auth/v1/user` endpoint before accepting the request. Data requests use the same user's access token so Supabase Row Level Security remains active.

## Environment variables

The MCP server and consent UI reuse the existing website configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

No Supabase service-role key is used or required by this MCP server. With Dynamic Client Registration enabled, supported clients can register through Supabase and use authorization-code-with-PKCE without a manually supplied client secret. If a client must use manual OAuth client registration, create that client in Supabase OAuth Apps and follow its public/confidential client requirements; enter a client secret only in the provider's secure OAuth settings when Supabase actually issues one. Never place OAuth client secrets, access tokens, or the Supabase service-role key in this repository, browser code, or chat.

## Supabase dashboard setup required

1. Open the Supabase project used by Chart Masters.
2. Navigate to **Authentication → OAuth Server** and enable OAuth 2.1 Server.
3. Set the Authorization Path to `/oauth/consent`.
4. Enable dynamic client registration if the dashboard exposes the option and if the MCP client supports it. Otherwise register the client using the OAuth Apps screen and its exact redirect URI.
5. Keep the existing Google and GitHub identity providers enabled.
6. Prefer asymmetric JWT signing (RS256 or ES256) for OAuth/OIDC deployments, especially if the `openid` scope is requested.
7. Confirm the Supabase project's Site URL is `https://chartmasters.top`.

Supabase OAuth server endpoints are derived from the existing project URL:

- Issuer: `<SUPABASE_URL>/auth/v1`
- Authorization: `<SUPABASE_URL>/auth/v1/oauth/authorize`
- Token: `<SUPABASE_URL>/auth/v1/oauth/token`
- JWKS: `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`
- OAuth discovery: `<SUPABASE_URL>/.well-known/oauth-authorization-server/auth/v1`

## Tools

All MCP requests require a valid Supabase OAuth bearer token.

### Public catalogue tools (available to authenticated connectors)

- `search_videos`: search published videos by title or description.
- `list_courses`: list published playlists and their published lessons.
- `list_indicators`: list published indicators and scripts, without exposing private storage paths.

### User tools

- `get_my_learning_progress`: summary of the authenticated user's watched and completed videos.
- `get_my_activity_heatmap`: daily activity counts over the last 365 days.
- `list_my_favorites`: the authenticated user's saved videos.

All tools are read-only. No tool can change a profile, course, favorite, progress record, indicator, or admin setting.

## Heatmap semantics

The current database stores one `user_video_progress` row per user and video. The heatmap therefore counts videos whose `last_watched_at` falls on a day; it does not represent watch-session count or time spent watching.

## Supported AI clients

Setup instructions for the supported remote clients are in [MCP clients: Claude, Grok, and Gemini](./mcp-clients.md). ChatGPT is intentionally excluded from this integration scope.

## Automated endpoint smoke test

After a Preview deployment is ready, run the public, non-authenticated endpoint checks from a terminal:

```bash
MCP_BASE_URL=https://YOUR-PREVIEW-HOST npm run test:mcp
```

The test checks protected-resource metadata, its origin, CORS preflight for metadata and MCP, and the unauthenticated 401 discovery challenge. It does not replace interactive OAuth and per-user RLS tests in each AI client.

If a Vercel Preview deployment is protected by Deployment Protection, a direct Node request may receive a Vercel login redirect before it reaches the application. In that case, run the checks against a publicly reachable deployment or use your authenticated Vercel access path; the redirect is not an MCP API response. Do not disable Deployment Protection just to make the smoke test pass.

## Deployment and verification checklist

1. Confirm the two existing Supabase environment variables are present in the Vercel project.
2. Deploy branch `feat/chart-masters-mcp` as a Preview deployment first.
3. Confirm the Preview build succeeds and the metadata URL returns the expected resource and Supabase issuer.
4. Enable Supabase OAuth Server and set the authorization path to `/oauth/consent`.
5. Connect an MCP client to the Preview endpoint and complete the browser-based consent flow.
6. Test each tool using a non-admin test account and verify that RLS prevents cross-user access.
7. Merge to the production branch only after the OAuth flow and all tool calls pass.

## Security notes

- No service-role key is used.
- No write tools are registered.
- Draft videos, draft playlists, and draft indicators are excluded by explicit published-status filters.
- The MCP endpoint rejects missing or invalid bearer tokens.
- Personal data tools require a valid Supabase OAuth access token and rely on the existing RLS policies.
- Responses are marked `Cache-Control: no-store`.
- Never put OAuth client secrets, Supabase service-role keys, or user access tokens in source control or chat.
