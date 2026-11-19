import { useEffect, useState } from 'react'
import { userAuth } from '../lib/supabase'

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
    } catch (err) {
      setError(err.message || 'امکان شروع ورود با گوگل وجود ندارد.')
      setLoading(false)
    }
  }

  return (
    <main className="cm-auth-page" dir="rtl">
      <div className="cm-auth-backdrop" aria-hidden="true">
        <span className="cm-auth-glow cm-auth-glow-one" />
        <span className="cm-auth-glow cm-auth-glow-two" />
        <span className="cm-auth-grid" />
      </div>

      <a className="cm-auth-back" href="/">
        <span aria-hidden="true">←</span>
        بازگشت به سایت
      </a>

      <div className="cm-auth-layout">
        <section className="cm-auth-visual" aria-label="چارت مسترز؛ مسیر حرفه‌ای یادگیری ترید">
          <div className="cm-auth-visual-top">
            <span className="cm-auth-live-dot" />
            MARKET KNOWLEDGE · WITHOUT BORDERS
          </div>

          <div className="cm-crystal-stage" aria-hidden="true">
            <div className="cm-crystal-orbit cm-crystal-orbit-one" />
            <div className="cm-crystal-orbit cm-crystal-orbit-two" />
            <div className="cm-crystal-halo" />
            <svg className="cm-crystal-art" viewBox="0 0 440 440" fill="none">
              <defs>
                <linearGradient id="crystal-main" x1="102" y1="57" x2="342" y2="370" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E5D8FF" />
                  <stop offset=".28" stopColor="#9E8BFF" />
                  <stop offset=".65" stopColor="#5E7CFF" />
                  <stop offset="1" stopColor="#5CE2DE" />
                </linearGradient>
                <linearGradient id="crystal-side" x1="220" y1="90" x2="333" y2="350" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D8C9FF" stopOpacity=".9" />
                  <stop offset="1" stopColor="#45D8D5" stopOpacity=".18" />
                </linearGradient>
                <linearGradient id="crystal-left" x1="120" y1="120" x2="220" y2="350" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B9A8FF" stopOpacity=".9" />
                  <stop offset="1" stopColor="#596BDF" stopOpacity=".16" />
                </linearGradient>
                <filter id="crystal-shadow" x="25" y="15" width="390" height="410" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                  <feGaussianBlur stdDeviation="17" />
                </filter>
              </defs>
              <path d="M220 46 337 133 315 290 220 386 105 291 84 133 220 46Z" fill="#7D75FF" opacity=".23" filter="url(#crystal-shadow)" />
              <path d="m220 48 113 76-27 171-86 91-112-91-24-171 136-76Z" fill="url(#crystal-main)" fillOpacity=".13" stroke="#C8C5FF" strokeOpacity=".75" strokeWidth="1.5" />
              <path d="m220 48 0 338-112-91-24-171 136-76Z" fill="url(#crystal-left)" fillOpacity=".48" />
              <path d="m220 48 113 76-27 171-86 91V48Z" fill="url(#crystal-side)" fillOpacity=".35" />
              <path d="m84 124 136 24 113-24M84 124l136 262 0-238M333 124 220 386M108 295l112-147 86 147M108 295l207 0" stroke="#DAD8FF" strokeOpacity=".68" strokeWidth="1.2" />
              <path d="m220 48 0 100 86 147M220 148l-112 147" stroke="#8FEAE8" strokeOpacity=".72" strokeWidth="1.1" />
              <path d="m84 124 136 24 113-24-27-47-86-29-91 29-45 47Z" fill="#E5DCFF" fillOpacity=".1" />
              <path d="m220 48 0 100 113-24-27-47-86-29Z" fill="#D9D1FF" fillOpacity=".2" />
              <path d="m108 295 112 91 0-238-112 147Z" fill="#6478FF" fillOpacity=".15" />
              <path d="m220 148 86 147 27-171-113 24Z" fill="#A5F5F0" fillOpacity=".14" />
              <path d="m108 295 207 0-95 91-112-91Z" fill="#65DCD9" fillOpacity=".12" />
              <circle cx="220" cy="48" r="4" fill="#F0ECFF" />
              <circle cx="333" cy="124" r="3" fill="#8CF4EE" />
              <circle cx="108" cy="295" r="3" fill="#BDAAFF" />
            </svg>
            <span className="cm-crystal-spark cm-crystal-spark-a">✦</span>
            <span className="cm-crystal-spark cm-crystal-spark-b">✧</span>
            <span className="cm-crystal-spark cm-crystal-spark-c">·</span>
          </div>

          <div className="cm-auth-chart-card" aria-hidden="true">
            <div className="cm-auth-chart-heading">
              <span>MARKET STRUCTURE</span>
              <strong>+12.84% <i>↗</i></strong>
            </div>
            <svg viewBox="0 0 310 82" fill="none">
              <path d="M2 65 28 58 48 63 72 42 94 48 119 29 142 37 166 17 190 27 214 12 239 21 263 7 287 13 308 2" stroke="url(#chart-line)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 65 28 58 48 63 72 42 94 48 119 29 142 37 166 17 190 27 214 12 239 21 263 7 287 13 308 2V82H2V65Z" fill="url(#chart-fill)" />
              <defs>
                <linearGradient id="chart-line" x1="2" y1="40" x2="308" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#A88CFF" /><stop offset="1" stopColor="#63E5DE" /></linearGradient>
                <linearGradient id="chart-fill" x1="155" y1="2" x2="155" y2="82" gradientUnits="userSpaceOnUse"><stop stopColor="#8C8BFF" stopOpacity=".2" /><stop offset="1" stopColor="#8C8BFF" stopOpacity="0" /></linearGradient>
              </defs>
            </svg>
          </div>

          <div className="cm-auth-visual-copy">
            <span>LEARN · ANALYZE · GROW</span>
            <h2>دانش بازار،<br /><em>قدرت تصمیم‌گیری توست.</em></h2>
            <p>آموزش‌های منتخب بازارهای مالی، با ترجمه فارسی و مسیری روشن برای یادگیری.</p>
          </div>
          <div className="cm-auth-visual-foot">
            <span><i /> محتوای تخصصی</span>
            <span><i /> یادگیری بدون مرز</span>
            <span><i /> همراه مسیر معامله‌گری</span>
          </div>
        </section>

        <section className="cm-auth-panel">
          <div className="cm-auth-brand-row">
            <a className="cm-auth-brand" href="/" aria-label="ChartMasters صفحه اصلی">
              <img src="/chartmasters-icon.webp" alt="" />
              <span>Chart<span>Masters</span></span>
            </a>
            <span className="cm-auth-secure"><span>✦</span> SECURE ACCESS</span>
          </div>

          <div className="cm-auth-form-content">
            <span className="cm-auth-kicker">CHARTMASTERS ACCOUNT</span>
            <h1>{user ? 'ورود با موفقیت انجام شد' : 'خوش اومدی به دنیای چارت مسترز'}</h1>
            <p>
              {user
                ? 'حساب گوگل شما با موفقیت به چارت مسترز متصل شد.'
                : 'برای ادامه مسیر یادگیری و دسترسی به فضای شخصی خودت وارد شو.'}
            </p>

            {loading && <div className="user-auth-status">در حال بررسی اطلاعات ورود...</div>}
            {error && <div className="user-auth-error" role="alert">{error}</div>}

            {user ? (
              <div className="user-auth-success">
                {user.email && <strong>{user.email}</strong>}
                <a className="cm-auth-submit" href="/">رفتن به صفحه اصلی <span>←</span></a>
              </div>
            ) : (
              <button className="cm-auth-google" type="button" onClick={handleGoogleLogin} disabled={loading}>
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/>
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/>
                  <path fill="#4A90E2" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"/>
                  <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2Z"/>
                </svg>
                <span>{loading ? 'لطفاً صبر کن...' : 'ادامه با حساب گوگل'}</span>
                <span className="cm-auth-google-arrow">←</span>
              </button>
            )}

            <div className="cm-auth-divider"><span>ورود امن و سریع</span></div>
            <div className="cm-auth-benefits">
              <div><span className="cm-auth-benefit-icon">✦</span><span><strong>فضای شخصی تو</strong><small>علاقه‌مندی‌ها و تاریخچه یادگیری</small></span></div>
              <div><span className="cm-auth-benefit-icon">↗</span><span><strong>ادامه از آخرین نقطه</strong><small>پیشرفت دوره‌ها همیشه همراهته</small></span></div>
            </div>
          </div>

          <div className="cm-auth-panel-foot">
            <span>با ورود به حساب، تجربه یادگیریت رو ادامه می‌دی.</span>
            <span>© CHARTMASTERS</span>
          </div>
        </section>
      </div>
    </main>
  )
}

export default GoogleLogin
