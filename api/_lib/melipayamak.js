// ارسال پیامک الگو‌محور (خدماتی) با ملی پیامک
// نام کاربری و رمز فقط از متغیرهای محیطی سرور خوانده می‌شود، نه از کد سایت.

const REST_URL = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber'
const TIMEOUT_MS = 4000 // Supabase برای پاسخ Hook فقط چند ثانیه صبر می‌کند

// 989121234567 یا +989121234567 → 09121234567
export function toLocalIranPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (/^989\d{9}$/.test(digits)) return `0${digits.slice(2)}`
  if (/^09\d{9}$/.test(digits)) return digits
  if (/^9\d{9}$/.test(digits)) return `0${digits}`
  return null
}

export async function sendPatternSms({ to, args, bodyId }) {
  const username = process.env.MELIPAYAMAK_USERNAME
  const password = process.env.MELIPAYAMAK_PASSWORD
  if (!username || !password) throw new Error('تنظیمات ملی پیامک روی سرور کامل نیست.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(REST_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password, text: args.join(';'), to, bodyId: String(bodyId) }),
    })
    const data = await response.json().catch(() => null)
    const success = response.ok && data && Number(data.RetStatus) === 1 && /^\d{8,}$/.test(String(data.Value))
    if (!success) {
      // رمز یا شماره کامل در لاگ ثبت نمی‌شود
      throw new Error(`ملی پیامک ارسال را قبول نکرد (HTTP ${response.status}، RetStatus ${data?.RetStatus}، ${data?.StrRetStatus || data?.Value || 'بدون پاسخ'})`)
    }
    return data.Value
  } finally {
    clearTimeout(timer)
  }
}
