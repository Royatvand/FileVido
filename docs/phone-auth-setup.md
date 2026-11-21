# Phone authentication setup

This branch adds a phone OTP UI and uses Supabase Auth as the OTP authority. It does not generate or store OTPs in the browser.

## Supabase Edge Function secrets

Deploy `supabase/functions/send-sms/index.ts` as the `send-sms` Edge Function with JWT verification disabled. The function verifies Supabase Auth's Standard Webhooks signature itself.

Set these secrets in Supabase Edge Function secrets:

- `SEND_SMS_HOOK_SECRET`: the Auth Hook signing secret copied from the Supabase Auth Hooks configuration (format `v1,whsec_...`).
- `PAYAMAK_USERNAME`: Payamak Panel username.
- `PAYAMAK_API_KEY`: API Key from Payamak Panel. Never commit this value.
- `PAYAMAK_BODY_ID`: approved template id; defaults to `453784`.

The provider request uses the `ApiKey` field (not `password`), as required by the provider's documented error 110 response.

## Configure Supabase Auth

1. Enable Phone provider in Authentication > Providers.
2. Keep SMS auto-confirm disabled so Supabase generates and validates OTPs.
3. In Authentication > Hooks, enable **Send SMS** and set its HTTP endpoint to:
   `https://bpvkdtwlcpfsnvmhzagd.supabase.co/functions/v1/send-sms`
4. Copy the generated signing secret into the Edge Function secret `SEND_SMS_HOOK_SECRET`.
5. Keep the Hook secret and Payamak API key server-side only.

## Important provider network constraint

The Payamak API may reject requests until its allowed-IP requirement is resolved (error `109-`). The code does not spoof or bypass IP restrictions. In that case OTP requests fail safely and the UI shows an error. Live SMS delivery remains unverified until Payamak accepts the Edge Function's outbound requests.

## Account linking

Phone OTP sign-in is handled by Supabase Auth. A phone identity already linked to an existing Google account resolves to that same user. Supabase does not safely merge a new phone-only identity with an existing Google identity based on matching phone/email assumptions. Users with an existing Google-only account should continue using Google until a separate authenticated phone-linking flow is implemented. The signup tab creates a new phone identity.

## Verification

- Phone numbers are normalized to E.164 for Iran (`+989...`).
- OTP issuance, expiry, and verification are delegated to Supabase Auth.
- The UI applies a resend countdown; Supabase Auth rate limits remain authoritative.
- The Auth Hook signature is verified before the Payamak API is called.
- OTPs and provider credentials are never logged.
