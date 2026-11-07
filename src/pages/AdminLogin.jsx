import { useState } from 'react'
import { supabase } from '../lib/supabase'

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await supabase.signIn(email.trim(), password)
      const role = session.user?.app_metadata?.role
      if (role !== 'admin') {
        await supabase.signOut()
        throw new Error('این حساب اجازه دسترسی به پنل مدیریت را ندارد.')
      }
      window.location.href = '/admin'
    } catch (err) {
      setError(err.message || 'ورود انجام نشد. اطلاعات را بررسی کنید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-auth-page" dir="rtl">
      <a className="admin-back-link" href="/">← بازگشت به سایت</a>
      <form className="admin-auth-card" onSubmit={handleSubmit}>
        <span className="admin-brand-mark">C<span>.</span></span>
        <span className="admin-kicker">CHARTMASTERS CONTROL ROOM</span>
        <h1>ورود مدیر</h1>
        <p>برای مدیریت ویدیوها وارد حساب مدیر شوید.</p>
        <label htmlFor="admin-email">ایمیل</label>
        <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" required />
        <label htmlFor="admin-password">رمز عبور</label>
        <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="رمز عبور حساب" required />
        {error && <div className="admin-alert error">{error}</div>}
        <button className="admin-primary-button" type="submit" disabled={loading}>{loading ? 'در حال ورود...' : 'ورود به پنل'} <span>←</span></button>
        <small>دسترسی فقط برای حساب‌هایی با نقش امن admin فعال است.</small>
      </form>
    </main>
  )
}

export default AdminLogin
