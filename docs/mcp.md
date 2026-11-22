# Chart Masters MCP

This document describes the first read-only MCP server for Chart Masters.

## Endpoint

After the branch is deployed to Vercel, the endpoint is:

`https://chartmasters.top/api/mcp`

The endpoint uses the official MCP TypeScript server SDK over stateless Streamable HTTP with JSON responses.

## Environment variables

The server reuses the same Supabase project configuration already used by the website:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

No Supabase service-role key is required or used. Do not add a service-role key to this MCP endpoint.

## Tools

### Public tools

- `search_videos`: search published videos by title or description.
- `list_courses`: list published playlists and their published lessons.
- `list_indicators`: list published indicators and scripts, without exposing private storage paths.

### User tools

- `get_my_learning_progress`: summary of the authenticated user's watched and completed videos.
- `get_my_activity_heatmap`: daily activity counts over the last 365 days.
- `list_my_favorites`: the authenticated user's saved videos.

All tools are read-only. No tool can change a profile, course, favorite, progress record, indicator, or admin setting.

## User authentication

For user-specific tools, the MCP request must include:

`Authorization: Bearer <Supabase user access token>`

The server validates the token against Supabase Auth, then makes the data request using that same user's token. Supabase Row Level Security remains active, and every user query is additionally scoped to the verified user ID.

The current implementation does **not** create an OAuth authorization server for MCP clients. Therefore, public tools can be tested without a user session, while user-specific tools require a client that can supply a valid Supabase access token. Do not copy a personal access token into a public document, repository, issue, or chat. The next authentication phase should connect the MCP OAuth flow to the site's existing Google/GitHub sign-in experience.

## Heatmap semantics

The current database stores one `user_video_progress` row per user and video. The heatmap therefore counts videos whose `last_watched_at` falls on a day; it does not represent watch-session count or time spent watching.

## Deployment checklist

1. Confirm the two Supabase environment variables are present in the Vercel project.
2. Deploy branch `feat/chart-masters-mcp` as a Preview deployment first.
3. Confirm the deployment installs `@modelcontextprotocol/server` and `zod`.
4. Test the public tools using an MCP client / MCP Inspector against the Preview URL plus `/api/mcp`.
5. Implement and test the MCP OAuth authorization flow before presenting private user tools as one-click sign-in in Claude.
6. Merge into the production branch only after the Preview build and tool tests pass.

## Security notes

- No service-role key is used.
- No write tools are registered.
- Draft videos, draft playlists, draft indicators, and other admin data are excluded by explicit published-status filters and Supabase RLS.
- Personal data tools require a Supabase user access token and rely on the existing RLS policies.
- Server responses are marked `Cache-Control: no-store`.
