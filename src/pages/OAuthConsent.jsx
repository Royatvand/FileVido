import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { userAuth } from '../lib/supabase'
import ThemeToggle from '../components/ThemeToggle'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null

const SCOPE_LABELS = {
  openid: 'شناسه پایه حساب',
  profile: 'اطلاعات عمومی پروفایل',
  email: 'آدرس ایمیل',
  phone: 'شماره تلفن',
}

export default function OAuthConsent() {
  const authorizationId = useMemo(
    () => new URLSearchParams(window.location.search).get('authorization_id') || '',
    [],
  )
  const [details, setDetails] = useState(null)
  const [busy, setBusy] = useState(true)
  const [decision, setDecision] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      if (!authorizationId) {
        setError('درخواست اتصال معتبر نیست؛ شناسه مجوز پیدا نشد.')
        setBusy(false)
        return
      }
      if (!supabase) {
        setError('تنظیمات اتصال حساب کاربری در سایت کامل نیست.')
        setBusy(false)
        return
      }

      try {
        const session = await userAuth.getValidSession()
        if (!session?.access_token || !session?.refresh_token) {
          const next = encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)
          window.location.replace(`/login?next=${next}`)
          return
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
        if (sessionError) throw sessionError

        const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
        if (detailsError) throw detailsError

        if (data && !('authorization_id' in data) && data.redirect_url) {
          window.location.replace(data.redirect_url)
          return
        }
        if (active) setDetails(data)
      } catch (err) {
        if (active) setError(err?.message || 'خواندن جزئیات درخواست اتصال ناموفق بود.')
      } finally {
        if (active) setBusy(false)
      }
    }

    load()
    return () => { active = false }
  }, [authorizationId])

  async function handleDecision(approve) {
    if (!supabase || !authorizationId || decision) return
    setDecision(approve ? 'approve' : 'deny')
    setError('')
    try {
      const result = approve
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId)
      if (result.error) throw result.error
      if (!result.data?.redirect_url) throw new Error('آدرس بازگشت از سرویس احراز هویت دریافت نشد.')
      window.location.assign(result.data.redirect_url)
    } catch (err) {
      setError(err?.message || 'ثبت تصمیم انجام نشد.')
      setDecision('')
    }
  }

  const scopes = String(details?.scope || '').split(/\s+/).filter(Boolean)

  return (
    <main className="login-page" dir="rtl">
      <ThemeToggle />
      <section className="login-card" aria-labelledby="oauth-title">
        <a className="login-brand" href="/" aria-label="ChartMasters صفحه اصلی">
          <img src="/chartmasters-icon.webp" alt="" />
          <span>Chart<span>Masters</span></span>
        </a>
        <div className="oauth-consent-icon" aria-hidden="true">✦</div>
        <h1 id="oauth-title">اتصال به چارت مسترز</h1>
        <p className="login-lead">پیش از اتصال دستیار هوش مصنوعی، دسترسی درخواستی را بررسی و تأیید کن.</p>
        {busy && <div className="user-auth-status" role="status">در حال بررسی درخواست اتصال...</div>}
        {error && <div className="user-auth-error" role="alert">{error}</div>}
        {!busy && details && (
          <>
            <div className="oauth-client-card">
              <span className="oauth-eyebrow">درخواست اتصال از طرف</span>
              <strong>{details.client?.name || 'یک برنامه خارجی'}</strong>
              <span className="oauth-client-url">{details.client?.uri || 'اتصال امن به حساب چارت مسترز'}</span>
            </div>
            <div className="oauth-client-card">
              <span className="oauth-eyebrow">آدرس بازگشت پس از تأیید دسترسی</span>
              <span className="oauth-client-url">{details.redirect_uri || 'آدرس بازگشت از سوی سرویس احراز هویت مشخص نشده است.'}</span>
            </div>
            <div className="oauth-scope-list">
              <strong>مجوزهای درخواستی</strong>
              {scopes.length ? scopes.map((scope) => (
                <div className="oauth-scope-item" key={scope}>
                  <span aria-hidden="true">✓</span>
                  <span>{SCOPE_LABELS[scope] || scope}</span>
                </div>
              )) : <p>این برنامه مجوز اضافه‌ای درخواست نکرده است.</p>}
            </div>
            <p className="oauth-consent-note">فقط دسترسی‌های نمایش‌داده‌شده تأیید می‌شوند. هر زمان بخواهی می‌توانی دسترسی برنامه را لغو کنی.</p>
            <div className="oauth-consent-actions">
              <button type="button" className="login-google" onClick={() => handleDecision(true)} disabled={Boolean(decision)}>
                {decision === 'approve' ? 'در حال اتصال...' : 'تأیید و اتصال'}
              </button>
              <button type="button" className="oauth-deny-button" onClick={() => handleDecision(false)} disabled={Boolean(decision)}>
                {decision === 'deny' ? 'در حال لغو...' : 'رد درخواست'}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
