import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const PAYAMAK_URL = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber'
const BODY_ID = Deno.env.get('PAYAMAK_BODY_ID') || '453784'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function verifyHook(payload: string, headers: Record<string, string>, configuredSecrets: string) {
  const secrets = configuredSecrets.split('|').map((value) => value.trim()).filter(Boolean)
  for (const configured of secrets) {
    const secret = configured.replace(/^v1,whsec_/, '')
    try {
      const webhook = new Webhook(secret)
      return webhook.verify(payload, headers)
    } catch {
      // Try the next active secret during key rotation.
    }
  }
  throw new Error('Invalid Auth Hook signature')
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')
  const username = Deno.env.get('PAYAMAK_USERNAME')
  const apiKey = Deno.env.get('PAYAMAK_API_KEY')
  if (!hookSecret || !username || !apiKey) {
    console.error('SMS provider secrets are not configured')
    return json({ error: 'SMS provider is not configured' }, 500)
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers.entries())
    const event = verifyHook(payload, headers, hookSecret) as {
      user?: { phone?: string }
      sms?: { otp?: string }
    }

    const phone = event.user?.phone || ''
    const otp = event.sms?.otp || ''
    if (!/^\+989\d{9}$/.test(phone) || !/^\d{6}$/.test(otp)) {
      return json({ error: 'Invalid phone or OTP payload' }, 400)
    }

    const body = new URLSearchParams({
      username,
      ApiKey: apiKey,
      to: phone,
      text: otp,
      bodyId: BODY_ID,
    })

    const response = await fetch(PAYAMAK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
    })

    const raw = await response.text()
    let result: Record<string, unknown> = {}
    try {
      result = JSON.parse(raw)
    } catch {
      result = { Value: raw }
    }

    const successful = response.ok && Number(result.RetStatus) === 1 &&
      String(result.StrRetStatus || '').toLowerCase() === 'ok'

    if (!successful) {
      // Never log OTPs, API keys, or the full provider response.
      console.error('Payamak SMS delivery failed', {
        httpStatus: response.status,
        retStatus: result.RetStatus,
        value: result.Value,
      })
      return json({ error: 'SMS delivery failed', code: String(result.Value || 'PROVIDER_ERROR') }, 502)
    }

    return json({})
  } catch (error) {
    console.error('Send SMS hook failed', error instanceof Error ? error.message : 'Unknown error')
    return json({ error: 'Unable to process SMS hook' }, 400)
  }
})
