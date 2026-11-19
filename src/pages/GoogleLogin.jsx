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
    return (
    <main className="cm-auth-page" dir="rtl">
      <div className="cm-auth-backdrop" aria-hidden="true"><div className="cm-auth-grid" /><div className="cm-auth-glow" /></div>
      <a className="cm-auth-back" href="/"><span aria-hidden="true">→</span> بازگشت به سایت</a>
      <div className="cm-auth-layout">
        <section className="cm-auth-visual" aria-label="درباره چارت مسترز">
          <div className="cm-auth-visual-top"><span className="cm-auth-mark">CM</span><span>CHARTMASTERS <i /> MARKET EDUCATION</span></div>
          <div className="cm-auth-visual-copy">
            <span className="cm-auth-eyebrow">A CLEARER WAY TO LEARN</span>
            <h2>بازار را عمیق‌تر<br />بفهم؛ <em>هوشمندتر</em><br />تصمیم بگیر.</h2>
            <p>یک فضای متمرکز برای یادگیری بازارهای مالی؛ از آموزش‌های تخصصی تا مرور و پیگیری مسیر پیشرفت.</p>
          </div>
          <div className="cm-auth-market" aria-hidden="true">
            <div className="cm-auth-market-head"><span>MARKET STRUCTURE</span><span>EDUCATION / INSIGHT</span></div>
            <svg viewBox="0 0 560 180" fill="none">
              <g className="cm-auth-chart-grid"><path d="M0 35H560M0 80H560M0 125H560M70 0V180M180 0V180M290 0V180M400 0V180M510 0V180" /></g>
              <path className="cm-auth-chart-line" d="M0 145L42 132L76 139L112 105L145 116L181 91L215 101L250 67L286 82L322 51L357 66L393 42L430 57L466 28L505 43L560 12" />
              <path className="cm-auth-chart-baseline" d="M0 160H560" />
            </svg>
            <div className="cm-auth-market-foot"><span>STRUCTURE</span><span>LIQUIDITY</span><span>PRICE ACTION</span><span>RISK</span></div>
          </div>
          <div className="cm-auth-visual-foot"><span>آموزش هدفمند</span><span>محتوای فارسی</span><span>مسیر یادگیری شخصی</span></div>
        </section>
        <section className="cm-auth-panel">
          <div className="cm-auth-brand-row">
            <a className="cm-auth-brand" href="/" aria-label="ChartMasters صفحه اصلی"><img src="/chartmasters-icon.webp" alt="" /><span>Chart<span>Masters</span></span></a>
            <span className="cm-auth-secure"><span /> SECURE SIGN IN</span>
          </div>
          <div className="cm-auth-form-content">
            <span className="cm-auth-kicker">حساب کاربری</span>
            <h1>{user ? 'ورود با موفقیت انجام شد' : 'به چارت مسترز خوش آمدی'}</h1>
            <p>{user ? 'حساب گوگل شما با موفقیت به چارت مسترز متصل شد.' : 'برای دسترسی به فضای شخصی، دوره‌ها و ادامه مسیر یادگیری وارد حساب خود شو.'}</p>
            {loading && <div className="user-auth-status">در حال بررسی اطلاعات ورود...</div>}
            {error && <div className="user-auth-error" role="alert">{error}</div>}
            {user ? (
              <div className="user-auth-success">{user.email && <strong>{user.email}</strong>}<a className="cm-auth-submit" href="/">رفتن به صفحه اصلی <span>←</span></a></div>
            ) : (
              <button className="cm-auth-google" type="button" onClick={handleGoogleLogin} disabled={loading}>
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/>
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/>
                  <path fill="#4A90E2" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"/>
                  <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2Z"/>
                </svg>
                <span>{loading ? 'لطفاً صبر کن...' : 'ادامه با حساب گوگل'}</span><span className="cm-auth-google-arrow">←</span>
              </button>
            )}
            <div className="cm-auth-divider"><span>ورود امن و سریع</span></div>
            <div className="cm-auth-benefits">
              <div><span className="cm-auth-benefit-icon">01</span><span><strong>فضای شخصی و اختصاصی</strong><small>علاقه‌مندی‌ها و تاریخچه یادگیری</small></span></div>
              <div><span className="cm-auth-benefit-icon">02</span><span><strong>ادامه مسیر از آخرین نقطه</strong><small>پیشرفت دوره‌ها همراه حساب تو می‌ماند</small></span></div>
            </div>
          </div>
          <div className="cm-auth-panel-foot"><span>با ورود، یادگیری را از همان‌جا ادامه بده.</span><span>© CHARTMASTERS</span></div>
        </section>
      </div>
    </main>
  )

}

export default GoogleLogin
