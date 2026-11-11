// Supabase Auth "Send SMS" Hook: POST /api/send-sms-hook
//
// Supabase خودش کد تأیید را می‌سازد و برای ارسال آن، این آدرس را صدا می‌زند.
// ما امضا را بررسی می‌کنیم و کد را با الگوی تأییدشده در ملی پیامک می‌فرستیم.
//
// متغیرهای محیطی لازم (در Vercel):
//   SEND_SMS_HOOK_SECRET     مقدار v1,whsec_... از تنظیمات Hook در Supabase
//   MELIPAYAMAK_USERNAME / MELIPAYAMAK_PASSWORD
//   MELIPAYAMAK_BODY_ID      کد الگو (پیش‌فرض ۴۵۳۳۶۳: «کد تایید شما {0} می‌باشد»)

import { verifyWebhook } from './_lib/standard-webhook.js'
import { sendPatternSms, toLocalIranPhone } from './_lib/melipayamak.js'

// برای بررسی امضا باید بدنهٔ خام را داشته باشیم
export const config = { api: { bodyParser: false } }

async function readRawBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function fail(response, status, message) {
  response.status(status).json({ error: { http_code: status, message } })
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return fail(response, 405, 'Method not allowed')
  }

  const rawBody = await readRawBody(request)
  if (!verifyWebhook(rawBody, request.headers, process.env.SEND_SMS_HOOK_SECRET)) {
    return fail(response, 401, 'امضای درخواست نامعتبر است.')
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return fail(response, 400, 'بدنهٔ درخواست نامعتبر است.')
  }

  const phone = toLocalIranPhone(payload?.user?.phone)
  const otp = String(payload?.sms?.otp || '')
  if (!phone) return fail(response, 400, 'فقط شماره موبایل ایران پشتیبانی می‌شود.')
  if (!/^\d{4,8}$/.test(otp)) return fail(response, 400, 'کد تأیید نامعتبر است.')

  try {
    await sendPatternSms({ to: phone, args: [otp], bodyId: process.env.MELIPAYAMAK_BODY_ID || '453363' })
    return response.status(200).json({})
  } catch (error) {
    console.error('send-sms-hook:', error.message)
    return fail(response, 502, 'ارسال پیامک انجام نشد.')
  }
}
