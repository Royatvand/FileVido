import { useEffect, useState } from 'react'
import { userAuth } from '../lib/supabase'

const navigation = [
  { id: 'overview', label: 'نمای کلی', icon: '⌂' },
  { id: 'courses', label: 'دوره‌های من', icon: '▤' },
  { id: 'favorites', label: 'علاقه‌مندی‌ها', icon: '♡' },
  { id: 'history', label: 'تاریخچه تماشا', icon: '◷' },
  { id: 'progress', label: 'پیشرفت یادگیری', icon: '↗' },
]

function UserDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

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
    <section className="user-dashboard" dir="rtl">
      <button className="user-dashboard-mobile-toggle" type="button" aria-expanded={menuOpen} aria-controls="user-dashboard-sidebar" onClick={() => setMenuOpen((open) => !open)}>
        <span>☰</span> منوی داشبورد
      </button>
      <div className="user-dashboard-layout">
        <aside id="user-dashboard-sidebar" className={'user-dashboard-sidebar ' + (menuOpen ? 'is-open' : '')}>
          <div className="user-dashboard-side-brand">
            <span className="user-dashboard-brand-mark">CM</span>
            <div><strong>CHARTMASTERS</strong><small>فضای یادگیری تو</small></div>
          </div>
          <span className="user-dashboard-side-label">حساب کاربری</span>
          <nav className="user-dashboard-nav" aria-label="منوی داشبورد">
            {navigation.map((item, index) => (
              <a key={item.id} href={'#' + item.id} className={'user-dashboard-nav-link ' + (index === 0 ? 'active' : '')} onClick={() => setMenuOpen(false)}>
                <span className="user-dashboard-nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
                {index === 0 && <span className="user-dashboard-nav-indicator" />}
              </a>
            ))}
          </nav>
          <div className="user-dashboard-sidebar-bottom">
            <div className="user-dashboard-help">
              <span>✦</span>
              <strong>مسیر یادگیریت رو ادامه بده</strong>
              <p>هر قدم کوچیک، تو رو به تسلط نزدیک‌تر می‌کنه.</p>
              <a href="/videos">مشاهده آموزش‌ها ←</a>
            </div>
            <button className="user-dashboard-sidebar-logout" type="button" onClick={handleSignOut}><span>↪</span> خروج از حساب</button>
          </div>
        </aside>

        <div className="user-dashboard-main">
          <header className="user-dashboard-topbar">
            <div><span className="user-dashboard-eyebrow">PERSONAL LEARNING SPACE</span><h1>داشبورد من</h1></div>
            <div className="user-dashboard-top-user">
              {avatar ? <img className="user-dashboard-avatar" src={avatar} alt="" referrerPolicy="no-referrer" /> : <div className="user-dashboard-avatar user-dashboard-avatar-fallback">{displayName.slice(0, 1)}</div>}
              <div><strong>{displayName}</strong><span>{user.email}</span></div>
            </div>
          </header>

          <section className="user-dashboard-welcome" id="overview">
            <div className="user-dashboard-welcome-copy">
              <span className="user-dashboard-welcome-tag"><i /> فضای اختصاصی تو</span>
              <h2>خوش برگشتی، {displayName.split(' ')[0]}! 👋</h2>
              <p>آماده‌ای یادگیریت رو از همون‌جایی که متوقف کردی ادامه بدی؟</p>
              <a href="/videos" className="user-dashboard-primary-link">شروع یادگیری <span>←</span></a>
            </div>
            <div className="user-dashboard-welcome-art" aria-hidden="true">
              <div className="user-dashboard-art-orbit" />
              <div className="user-dashboard-art-chart">
                <span>YOUR NEXT LEVEL</span><strong>KEEP<br />LEARNING<span>.</span></strong>
                <svg viewBox="0 0 210 70"><path d="M2 59 L28 47 L48 52 L72 29 L92 39 L116 15 L137 27 L160 8 L181 18 L208 2" /></svg>
              </div>
            </div>
          </section>

          <section className="user-dashboard-stats" aria-label="آمار یادگیری">
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon">▤</span><div><span>دوره‌های من</span><strong>—</strong><small>به‌زودی با اطلاعات واقعی</small></div></article>
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon">▶</span><div><span>ویدیوهای تماشا‌شده</span><strong>—</strong><small>به‌زودی با اطلاعات واقعی</small></div></article>
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon">◷</span><div><span>زمان یادگیری</span><strong>—</strong><small>به‌زودی با اطلاعات واقعی</small></div></article>
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon">♡</span><div><span>علاقه‌مندی‌ها</span><strong>—</strong><small>به‌زودی با اطلاعات واقعی</small></div></article>
          </section>

          <div className="user-dashboard-content-grid">
            <section className="user-dashboard-panel user-dashboard-continue" id="courses">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>ادامه یادگیری</h3></div><a href="/videos">همه آموزش‌ها <span>←</span></a></div>
              <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon">▶</span><strong>هنوز آموزشی برای نمایش نداریم</strong><p>وقتی تماشای یک ویدیو رو شروع کنی، ادامه اون رو اینجا پیدا می‌کنی.</p><a href="/videos">رفتن به کتابخانه آموزش‌ها</a></div>
            </section>
            <section className="user-dashboard-panel user-dashboard-progress" id="progress">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">YOUR LEARNING JOURNEY</span><h3>پیشرفت یادگیری</h3></div></div>
              <div className="user-dashboard-progress-visual"><div className="user-dashboard-progress-ring"><span>—<small>٪</small></span></div><div><strong>مسیرت تازه شروع شده</strong><p>با شروع اولین آموزش، میزان پیشرفتت اینجا نمایش داده می‌شه.</p></div></div>
              <div className="user-dashboard-progress-track"><span /></div>
              <small className="user-dashboard-progress-caption">اطلاعات پیشرفت پس از فعال‌شدن تاریخچه تماشا ثبت می‌شه.</small>
            </section>
            <section className="user-dashboard-panel" id="favorites">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">SAVED FOR LATER</span><h3>علاقه‌مندی‌ها</h3></div><span className="user-dashboard-panel-symbol">♡</span></div>
              <div className="user-dashboard-compact-empty">ویدیوهای موردعلاقه‌ات رو ذخیره کن تا همیشه اینجا در دسترست باشن.</div>
            </section>
            <section className="user-dashboard-panel" id="history">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">RECENT ACTIVITY</span><h3>فعالیت‌های اخیر</h3></div><span className="user-dashboard-panel-symbol">◷</span></div>
              <div className="user-dashboard-compact-empty">بعد از تماشای اولین ویدیو، فعالیت‌های اخیرت اینجا نمایش داده می‌شن.</div>
            </section>
          </div>
          <p className="user-dashboard-data-note">اطلاعات آماری و بخش‌های شخصی پس از اتصال تاریخچه تماشا و علاقه‌مندی‌ها به حساب کاربری، به‌صورت واقعی نمایش داده خواهند شد.</p>
        </div>
      </div>
    </section>
  )
}

export default UserDashboard
