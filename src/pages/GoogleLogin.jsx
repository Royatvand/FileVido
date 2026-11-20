import { useEffect, useState } from 'react'
import { userAuth } from '../lib/supabase'
import '../github-login.css'

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
          const session = await userAuth.completeOAuthSignIn(code)
          window.history.replaceState({}, document.title, '/login')
          if (active && session?.user) {
            setUser(session.user)
            window.location.replace(userAuth.consumeNext() || '/dashboard')
          }
        } catch (err) {
          window.history.replaceState({}, document.title, '/login')
          if (active) setError(err.message || 'ورود با حساب انتخاب‌شده انجام نشد.')
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

  async function handleOAuthLogin(provider) {
    setError('')
    setLoading(true)
    try {
      await userAuth.signInWithProvider(provider)
      setLoading(false)
    } catch (err) {
      setError(err.message || 'امکان شروع ورود وجود ندارد.')
      setLoading(false)
    }
  }

  return (
    <main className="cm-auth-page" dir="rtl">
      <div className="cm-auth-backdrop" aria-hidden="true">
        <div className="cm-auth-orb cm-auth-orb-one" />
        <div className="cm-auth-orb cm-auth-orb-two" />
        <div className="cm-auth-noise" />
      </div>

      <a className="cm-auth-back" href="/">
        <span aria-hidden="true">→</span> بازگشت به چارت مسترز
      </a>

      <div className="cm-auth-layout">
        <section className="cm-auth-visual" aria-label="معرفی چارت مسترز">
          <div className="cm-auth-visual-top">
            <a className="cm-auth-brand cm-auth-brand-visual" href="/" aria-label="ChartMasters صفحه اصلی">
              <img src="/chartmasters-icon.webp" alt="" />
              <span>Chart<span>Masters</span></span>
            </a>
            <span className="cm-auth-live"><i /> MARKET LEARNING PLATFORM</span>
          </div>

          <div className="cm-auth-visual-copy">
            <span className="cm-auth-eyebrow">LEARN THE MARKET. OWN YOUR EDGE.</span>
            <h2>دانشت را به<br /><em>برتری</em> تبدیل کن.</h2>
            <p>یادگیری بازارهای مالی، با محتوای تخصصی و فارسی؛ منظم‌تر یاد بگیر و مسیر پیشرفتت را ادامه بده.</p>
          </div>

          <div className="cm-auth-market" aria-hidden="true">
            <div className="cm-auth-market-head">
              <span>MARKET STRUCTURE</span><span>01 — LEARNING JOURNEY</span>
            </div>
            <svg viewBox="0 0 520 176" fill="none">
              <defs>
                <linearGradient id="cm-chart-fill" x1="260" y1="20" x2="260" y2="176" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9BE7B8" stopOpacity=".2" />
                  <stop offset="1" stopColor="#9BE7B8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="cm-auth-chart-grid">
                <path d="M0 35H520M0 78H520M0 121H520M65 0V176M170 0V176M275 0V176M380 0V176M485 0V176" />
              </g>
              <path className="cm-auth-chart-area" d="M0 140L38 128L72 134L108 101L143 113L179 86L214 96L250 62L285 77L321 45L356 59L392 35L427 50L464 21L493 34L520 10V176H0Z" />
              <path className="cm-auth-chart-line" d="M0 140L38 128L72 134L108 101L143 113L179 86L214 96L250 62L285 77L321 45L356 59L392 35L427 50L464 21L493 34L520 10" />
              <circle cx="520" cy="10" r="4" className="cm-auth-chart-dot" />
            </svg>
            <div className="cm-auth-market-foot">
              <span>PRICE ACTION</span><span>LIQUIDITY</span><span>RISK MANAGEMENT</span>
            </div>
          </div>

          <div className="cm-auth-visual-bottom">
            <div><strong>01</strong><span>آموزش تخصصی</span></div>
            <div><strong>02</strong><span>محتوای فارسی</span></div>
            <div><strong>03</strong><span>ادامه مسیر یادگیری</span></div>
          </div>
          <span className="cm-auth-watermark" aria-hidden="true">CM</span>
        </section>

        <section className="cm-auth-panel">
          <div className="cm-auth-panel-top">
            <span className="cm-auth-secure"><span /> SECURE ACCESS</span>
            <span className="cm-auth-step">ورود به حساب کاربری</span>
          </div>

          <div className="cm-auth-form-content">
            <div className="cm-auth-form-mark"><img src="/chartmasters-icon.webp" alt="" /></div>
            <span className="cm-auth-kicker">خوش برگشتی</span>
            <h1>{user ? 'ورود موفقیت‌آمیز بود' : 'به دنیای چارت مسترز خوش آمدی'}</h1>
            <p>{user ? 'حساب کاربری شما با موفقیت متصل شد.' : 'برای ورود به حساب و دسترسی به دوره‌ها و مسیر یادگیری‌ات، یکی از روش‌های زیر را انتخاب کن.'}</p>

            {loading && <div className="user-auth-status">در حال اتصال امن به حساب کاربری...</div>}
            {error && <div className="user-auth-error" role="alert">{error}</div>}

            {user ? (
              <div className="user-auth-success">
                {user.email && <strong>{user.email}</strong>}
                <a className="cm-auth-submit" href="/">رفتن به صفحه اصلی <span>←</span></a>
              </div>
            ) : (
              <div className="cm-auth-providers">
                <button className="cm-auth-provider cm-auth-provider-google" type="button" onClick={() => handleOAuthLogin('google')} disabled={loading}>
                  <span className="cm-auth-provider-icon" aria-hidden="true">
                    <svg viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/>
                      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/>
                      <path fill="#4285F4" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"/>
                      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2Z"/>
                    </svg>
                  </span>
                  <span>{loading ? 'لطفاً صبر کن...' : 'ادامه با حساب گوگل'}</span>
                  <span className="cm-auth-provider-arrow">←</span>
                </button>

                <button className="cm-auth-provider cm-auth-provider-github" type="button" onClick={() => handleOAuthLogin('github')} disabled={loading}>
                  <span className="cm-auth-provider-icon cm-auth-provider-icon-github" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.08c-3.1.67-3.75-1.32-3.75-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.76 2.2 3.23 1.68.1-.72.39-1.2.7-1.48-2.47-.28-5.07-1.24-5.07-5.5 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.12-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.27-2.6 5.22-5.08 5.5.4.35.75 1.02.75 2.06v3.05c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/>
                    </svg>
                  </span>
                  <span>{loading ? 'لطفاً صبر کن...' : 'ادامه با حساب گیت‌هاب'}</span>
                  <span className="cm-auth-provider-arrow">←</span>
                </button>
              </div>
            )}

            <div className="cm-auth-divider"><span>ورود سریع، بدون رمز عبور</span></div>
            <div className="cm-auth-trust">
              <span className="cm-auth-trust-icon">✓</span>
              <span>اطلاعات حساب تو با اتصال امن ارائه‌دهنده ورود محافظت می‌شود.</span>
            </div>
          </div>

          <div className="cm-auth-panel-foot">
            <span>با ورود، با قوانین و حریم خصوصی سایت موافقت می‌کنی.</span>
            <span>© CHARTMASTERS</span>
          </div>
        </section>
      </div>
    </main>
  )
}

export default GoogleLogin
