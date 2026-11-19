import { useEffect, useState } from 'react'
import { userAuth } from '../lib/supabase'
import './PhoneAuth.css'

function PhoneAuth() {
  const [mode, setMode] = useState('login')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('phone')
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (seconds <= 0) return undefined
    const timer = window.setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  async function handleSendCode(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const normalized = await userAuth.sendPhoneOtp(phone, mode === 'signup')
      setPhone(normalized)
      setStep('code')
      setSeconds(60)
      setNotice('کد تأیید برای شماره شما ارسال شد.')
    } catch (err) {
      setError(err.message || 'ارسال کد تأیید انجام نشد.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await userAuth.verifyPhoneOtp(phone, code)
      window.location.replace(userAuth.consumeNext() || '/dashboard')
    } catch (err) {
      setError(err.message || 'کد تأیید معتبر نیست.')
    } finally {
      setLoading(false)
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setStep('phone')
    setCode('')
    setError('')
    setNotice('')
  }

  return (
    <section className="cm-phone-auth" aria-label="ورود با شماره موبایل">
      <div className="cm-phone-auth-heading">
        <span className="cm-phone-auth-icon" aria-hidden="true">✦</span>
        <div>
          <strong>ورود با شماره موبایل</strong>
          <small>بدون نیاز به رمز عبور</small>
        </div>
      </div>

      <div className="cm-phone-auth-tabs" role="tablist" aria-label="نوع ورود">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>ورود</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => changeMode('signup')}>ثبت‌نام</button>
      </div>

      {step === 'phone' ? (
        <form className="cm-phone-auth-form" onSubmit={handleSendCode}>
          <label htmlFor="cm-phone-number">شماره موبایل</label>
          <div className="cm-phone-input-wrap">
            <span aria-hidden="true">🇮🇷 +98</span>
            <input
              id="cm-phone-number"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              dir="ltr"
              placeholder="0912 345 6789"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={16}
              required
            />
          </div>
          <button className="cm-phone-submit" type="submit" disabled={loading}>
            {loading ? 'در حال ارسال...' : 'دریافت کد تأیید'}
            <span aria-hidden="true">←</span>
          </button>
          {mode === 'signup' && <p className="cm-phone-auth-hint">با ثبت‌نام، حساب کاربری جدیدی با این شماره ساخته می‌شود.</p>}
        </form>
      ) : (
        <form className="cm-phone-auth-form" onSubmit={handleVerifyCode}>
          <label htmlFor="cm-phone-code">کد ۶ رقمی ارسال‌شده به {phone}</label>
          <input
            id="cm-phone-code"
            className="cm-phone-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            placeholder="••••••"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            pattern="[0-9]{6}"
            required
          />
          <button className="cm-phone-submit" type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'در حال بررسی...' : 'تأیید و ورود'}
            <span aria-hidden="true">←</span>
          </button>
          <div className="cm-phone-resend-row">
            <button type="button" onClick={() => { setStep('phone'); setCode(''); setError(''); setNotice('') }}>ویرایش شماره</button>
            <button type="button" disabled={loading || seconds > 0} onClick={handleSendCode}>
              {seconds > 0 ? `ارسال مجدد تا ${seconds} ثانیه` : 'ارسال مجدد کد'}
            </button>
          </div>
        </form>
      )}

      {notice && <p className="cm-phone-auth-notice" role="status">{notice}</p>}
      {error && <p className="cm-phone-auth-error" role="alert">{error}</p>}
      <p className="cm-phone-auth-hint">اگر قبلاً با گوگل حساب ساخته‌ای، برای جلوگیری از ایجاد حساب جداگانه ابتدا با گوگل وارد شو. اتصال شماره به حساب گوگل باید از داخل حساب و با تأیید مالکیت انجام شود.</p>
    </section>
  )
}

export default PhoneAuth
