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
            window.location.replace('/dashboard')
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
      if (active && session?.user) window.location.replace('/dashboard')
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
    <main className="user-auth-page" dir="rtl">
      <a className="user-auth-back" href="/">← بازگشت به سایت</a>
      <section className="user-auth-card">
        <a className="user-auth-brand" href="/">
          <img src="/chartmasters-icon.webp" alt="" />
          <span>Chart<span>Masters</span></span>
        </a>
        <span className="user-auth-kicker">CHARTMASTERS ACCOUNT</span>
        <h1>{user ? 'ورود با موفقیت انجام شد' : 'به چارت مسترز خوش آمدی'}</h1>
        <p>
          {user
            ? 'حساب گوگل شما با موفقیت به چارت مسترز متصل شد.'
            : 'برای ورود به حساب کاربری خود، از حساب گوگل استفاده کن.'}
        </p>

        {loading && <div className="user-auth-status">در حال بررسی اطلاعات ورود...</div>}
        {error && <div className="user-auth-error" role="alert">{error}</div>}

        {user ? (
          <div className="user-auth-success">
            {user.email && <strong>{user.email}</strong>}
            <a className="user-auth-primary" href="/">رفتن به صفحه اصلی <span>←</span></a>
          </div>
        ) : (
          <button className="user-google-button" type="button" onClick={handleGoogleLogin} disabled={loading}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/>
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/>
              <path fill="#4A90E2" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"/>
              <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2Z"/>
            </svg>
            {loading ? 'لطفاً صبر کن...' : 'ادامه با حساب گوگل'}
          </button>
        )}

        <small>ورود کاربران از طریق گوگل انجام می‌شود؛ ورود مدیر همچنان از صفحه مدیریت و به روش قبلی است.</small>
      </section>
    </main>
  )
}

export default GoogleLogin
