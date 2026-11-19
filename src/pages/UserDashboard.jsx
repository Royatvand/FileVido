import { useEffect, useState } from 'react'
import { userAuth } from '../lib/supabase'

function UserDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    userAuth.getValidSession()
      .then((session) => {
        if (!active) return
        if (!session?.user) {
          window.location.replace('/login?next=/dashboard')
          return
        }
        setUser(session.user)
      })
      .catch(() => {
        if (active) window.location.replace('/login?next=/dashboard')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  async function handleSignOut() {
    await userAuth.signOut()
    window.location.replace('/')
  }

  if (loading || !user) return <div className="user-dashboard-loading">در حال بارگذاری حساب کاربری...</div>

  const metadata = user.user_metadata || {}
  const displayName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'کاربر چارت مسترز'
  const avatar = metadata.avatar_url || metadata.picture || ''

  return (
    <section className="user-dashboard">
      <div className="user-dashboard-heading">
        <div>
          <span className="user-dashboard-eyebrow">CHARTMASTERS ACCOUNT</span>
          <h1>داشبورد من</h1>
          <p>به فضای شخصی یادگیری خودت خوش اومدی.</p>
        </div>
        <button className="user-dashboard-logout" type="button" onClick={handleSignOut}>خروج از حساب</button>
      </div>

      <div className="user-dashboard-profile">
        {avatar
          ? <img className="user-dashboard-avatar" src={avatar} alt="" referrerPolicy="no-referrer" />
          : <div className="user-dashboard-avatar user-dashboard-avatar-fallback">{displayName.slice(0, 1)}</div>}
        <div>
          <h2>{displayName}</h2>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="user-dashboard-grid">
        <article className="user-dashboard-card">
          <span className="user-dashboard-card-icon" aria-hidden="true">♡</span>
          <h3>علاقه‌مندی‌ها</h3>
          <p>ویدیوها و دوره‌هایی که ذخیره می‌کنی، اینجا در دسترس خواهند بود.</p>
        </article>
        <article className="user-dashboard-card">
          <span className="user-dashboard-card-icon" aria-hidden="true">◷</span>
          <h3>تاریخچه تماشا</h3>
          <p>به‌زودی می‌تونی ادامه تماشای ویدیوهای قبلی رو از همین بخش انجام بدی.</p>
        </article>
        <article className="user-dashboard-card">
          <span className="user-dashboard-card-icon" aria-hidden="true">▤</span>
          <h3>دوره‌های من</h3>
          <p>دوره‌هایی که دنبال می‌کنی در این بخش نمایش داده می‌شن.</p>
        </article>
        <article className="user-dashboard-card">
          <span className="user-dashboard-card-icon" aria-hidden="true">↗</span>
          <h3>پیشرفت یادگیری</h3>
          <p>میزان پیشرفت و ویدیوهای تکمیل‌شده بعد از اتصال اطلاعات یادگیری نمایش داده می‌شن.</p>
        </article>
      </div>

      <div className="user-dashboard-empty">
        فعلاً اطلاعات پروفایل از حساب گوگل دریافت می‌شه. برای ذخیره علاقه‌مندی‌ها، تاریخچه و پیشرفت، مرحله بعدی اتصال جداول اختصاصی و سیاست‌های امنیتی هر کاربر در Supabase است.
      </div>
    </section>
  )
}

export default UserDashboard
