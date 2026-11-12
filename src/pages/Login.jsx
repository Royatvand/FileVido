import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseIranMobile, maskPhone, toLatinDigits } from '../lib/phone'
import './Login.css'

const RESEND_SECONDS = 60

function friendlyError(error) {
  const text = String(error?.message || '')
  if (error?.code === 'over_sms_send_rate_limit' || error?.status === 429) return 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کن.'
  if (error?.code === 'otp_expired' || /expired|invalid/i.test(text)) return 'کد اشتباه است یا منقضی شده.'
  if (error?.code === 'sms_send_failed' || /sms/i.test(text)) return 'ارسال پیامک ناموفق بود. چند دقیقه بعد دوباره تلاش کن.'
  if (/Failed to fetch|NetworkError/i.test(text)) return 'اتصال برقرار نشد. اینترنت را بررسی کن.'
  return 'مشکلی پیش آمد. دوباره تلاش کن.'
}

// فقط مسیرهای داخل خود سایت مجاز است تا ورود به آدرس بیرونی هدایت نشود
function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next') || '/'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

function Login() {
  const [session, setSession] = useState(() => supabase.getUserSession())
  const [step, setStep] = useState('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [phone, setPhone] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    // صفحهٔ ورود نباید در نتایج جست‌وجو بیاید
    document.title = 'ورود | چارت مسترز'
    let robots = document.head.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    robots.setAttribute('content', 'noindex, nofollow')
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function requestCode(event) {
    event?.preventDefault()
    setError('')
    const parsed = parseIranMobile(step === 'code' && phone ? phone.local : phoneInput)
    if (!parsed) { setError('شماره موبایل را درست وارد کن (مثل 09121234567).'); return }
    setLoading(true)
    try {
      await supabase.sendPhoneOtp(parsed.e164)
      setPhone(parsed)
      setStep('code')
      setCode('')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode(event) {
    event.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code)) { setError('کد ۶ رقمی را کامل وارد کن.'); return }
    setLoading(true)
    try {
      await supabase.verifyPhoneOtp(phone.e164, code)
      window.location.replace(safeNext())
    } catch (err) {
      setError(friendlyError(err))
      setLoading(false)
    }
  }

  async function logout() {
    await supabase.signOutUser()
    setSession(null)
  }

  if (session) {
    const registered = session.user?.phone ? `0${String(session.user.phone).replace(/^\+?98/, '')}` : ''
    return (
      <section className="login-page">
        <div className="login-card">
          <span className="section-kicker">حساب کاربری</span>
          <h1>وارد شده‌ای</h1>
          {registered && <p>شمارهٔ ثبت‌شده: <strong dir="ltr">{maskPhone(registered)}</strong></p>}
          <div className="login-actions">
            <a className="primary-button" href="/">بازگشت به سایت</a>
            <button type="button" className="secondary-button" onClick={logout}>خروج از حساب</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <span className="section-kicker">ورود یا ثبت‌نام</span>
        <h1>{step === 'phone' ? 'ورود به چارت مسترز' : 'کد تأیید را وارد کن'}</h1>
        <p>
          {step === 'phone'
            ? 'شمارهٔ موبایلت را وارد کن؛ یک کد تأیید پیامک می‌کنیم. اگر حساب نداری، خودکار ساخته می‌شود.'
            : <>کد ۶ رقمی به شمارهٔ <strong dir="ltr">{phone?.local}</strong> پیامک شد.</>}
        </p>

        {step === 'phone' ? (
          <form onSubmit={requestCode} noValidate>
            <label htmlFor="login-phone">شمارهٔ موبایل</label>
            <input id="login-phone" type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" placeholder="09121234567" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} autoFocus />
            {error && <div className="login-error" role="alert">{error}</div>}
            <button type="submit" className="primary-button" disabled={loading}>{loading ? 'در حال ارسال...' : 'دریافت کد تأیید'}</button>
          </form>
        ) : (
          <form onSubmit={verifyCode} noValidate>
            <label htmlFor="login-code">کد تأیید</label>
            <input id="login-code" className="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} placeholder="------" value={code} onChange={(event) => setCode(toLatinDigits(event.target.value).replace(/\D/g, '').slice(0, 6))} autoFocus />
            {error && <div className="login-error" role="alert">{error}</div>}
            <button type="submit" className="primary-button" disabled={loading}>{loading ? 'در حال بررسی...' : 'ورود'}</button>
            <div className="login-secondary">
              <button type="button" className="login-link" onClick={() => { setStep('phone'); setError('') }}>تغییر شماره</button>
              <button type="button" className="login-link" disabled={cooldown > 0 || loading} onClick={requestCode}>{cooldown > 0 ? `ارسال دوباره (${cooldown})` : 'ارسال دوباره کد'}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

export default Login
