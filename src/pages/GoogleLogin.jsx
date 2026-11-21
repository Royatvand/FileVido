import { useEffect, useState } from 'react'
import { userAuth } from '../lib/supabase'
import ThemeToggle from '../components/ThemeToggle'

// Deterministic candle series for the backdrop (same on every render, no Math.random).
const CANDLES = (() => {
  let seed = 7
  const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  let price = 60
  return Array.from({ length: 46 }, () => {
    const open = price
    const close = Math.max(14, Math.min(92, open + (next() - 0.42) * 15))
    const high = Math.max(open, close) + next() * 7
    const low = Math.min(open, close) - next() * 7
    price = close
    return { open, close, high, low }
  })
})()

function CandleBackdrop() {
  return (
    <svg className="login-candles" viewBox="0 0 460 100" preserveAspectRatio="none" aria-hidden="true">
      {CANDLES.map((c, i) => {
        const x = i * 10 + 5
        const up = c.close >= c.open
        const top = 100 - Math.max(c.open, c.close)
        const height = Math.max(1.4, Math.abs(c.close - c.open))
        return (
          <g key={i} className={up ? 'is-up' : 'is-down'} style={{ '--i': i }}>
            <line x1={x} x2={x} y1={100 - c.high} y2={100 - c.low} />
            <rect x={x - 3} y={top} width="6" height={height} rx="0.8" />
          </g>
        )
      })}
    </svg>
  )
}

function GoogleLogin() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      userAuth.rememberNext(params.get('next'))
      const authError = params.get('error_description') || params.get('error')
      if (authError) {
        window.history.replaceState({}, document.title, '/login')
        if (active) setError(authError)
        return
      }
      if (code) {
        setLoading(true)
        try {
          const session = await userAuth.completeGoogleSignIn(code)
          window.history.replaceState({}, document.title, '/login')
          if (active && session?.user) {
            setUser(session.user)
            window.location.replace(userAuth.consumeNext() || '/dashboard')
          }
        } catch (err) {
          window.history.replaceState({}, document.title, '/login')
          if (active) setError(err.message || 'ورود با گوگل انجام نشد.')
        } finally {
          if (active) setLoading(false)
        }
        return
      }
      const session = await userAuth.getValidSession()
      if (active && session?.user) window.location.replace(userAuth.consumeNext() || '/dashboard')
    }
    handleCallback()
    return () => { active = false }
  }, [])

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    try {
      await userAuth.signInWithGoogle()
      setLoading(false) // the Android app returns here while the browser is open; the web page navigates away
    } catch (err) {
      setError(err.message || 'امکان شروع ورود با گوگل وجود ندارد.')
      setLoading(false)
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <CandleBackdrop />
      <a className="login-back" href="/">بازگشت به سایت</a>
      <ThemeToggle />
      <section className="login-card" aria-labelledby="login-title">
        <a className="login-brand" href="/" aria-label="ChartMasters صفحه اصلی"><img src="/chartmasters-icon.webp" alt="" /><span>Chart<span>Masters</span></span></a>
        <h1 id="login-title">{user ? 'وارد شدی' : 'وارد چارت‌مسترز شو'}</h1>
        <p className="login-lead">{user ? 'حساب گوگل‌ت وصل شد.' : 'پیشرفت دوره‌ها، علاقه‌مندی‌ها و تاریخچهٔ تماشا با حساب‌ت همراهت می‌ماند.'}</p>
        {loading && <div className="user-auth-status" role="status">در حال بررسی اطلاعات ورود...</div>}
        {error && <div className="user-auth-error" role="alert">{error}</div>}
        {user ? (
          <div className="user-auth-success">{user.email && <strong>{user.email}</strong>}<a className="login-google" href="/">رفتن به صفحهٔ اصلی</a></div>
        ) : (
          <button className="login-google" type="button" onClick={handleGoogleLogin} disabled={loading}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/>
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/>
              <path fill="#4A90E2" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"/>
              <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2Z"/>
            </svg>
            <span>{loading ? 'لطفاً صبر کن...' : 'ورود با حساب گوگل'}</span>
          </button>
        )}
        <ul className="login-points">
          <li>ادامهٔ دوره از آخرین جلسه، روی هر دستگاه</li>
          <li>ذخیرهٔ ویدیوهای مورد علاقه</li>
          <li>بدون رمز عبور؛ فقط حساب گوگل</li>
        </ul>
      </section>
    </main>
  )
}

export default GoogleLogin
