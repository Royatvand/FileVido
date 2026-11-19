import { useEffect, useState } from 'react'
import { LuLayoutDashboard, LuBookOpen, LuHeart, LuHistory, LuTrendingUp, LuSettings, LuSparkles, LuLogOut, LuPlay, LuCircleCheck, LuArrowLeft, LuChartNoAxesCombined, LuClock3 } from 'react-icons/lu'
import { userAuth, userLearning } from '../lib/supabase'

const sections = {
  favorites: { title: 'علاقه‌مندی‌های من', kicker: 'SAVED VIDEOS', description: 'ویدیوهایی که برای تماشای دوباره ذخیره کرده‌ای.' },
  history: { title: 'تاریخچه تماشا', kicker: 'WATCH HISTORY', description: 'ویدیوهایی که باز کرده‌ای؛ از آخرین بازدید به قدیمی‌تر.' },
  courses: { title: 'دوره‌های من', kicker: 'MY COURSES', description: 'دوره‌هایی که با تماشای یکی از جلسه‌هایشان شروع کرده‌ای.' },
  progress: { title: 'پیشرفت یادگیری', kicker: 'LEARNING PROGRESS', description: 'نمای کلی از جلسه‌های تکمیل‌شده و مسیر دوره‌ها.' },
  profile: { title: 'تنظیمات پروفایل', kicker: 'ACCOUNT SETTINGS', description: 'اطلاعات نمایشی حساب کاربری‌ات را مدیریت کن.' },
}

const navigation = [
  { id: 'overview', label: 'نمای کلی', icon: LuLayoutDashboard, color: 'mint', href: '/dashboard' },
  { id: 'courses', label: 'دوره‌های من', icon: LuBookOpen, color: 'blue', href: '/dashboard/courses' },
  { id: 'favorites', label: 'علاقه‌مندی‌ها', icon: LuHeart, color: 'rose', href: '/dashboard/favorites' },
  { id: 'history', label: 'تاریخچه تماشا', icon: LuHistory, color: 'amber', href: '/dashboard/history' },
  { id: 'progress', label: 'پیشرفت یادگیری', icon: LuTrendingUp, color: 'violet', href: '/dashboard/progress' },
  { id: 'profile', label: 'تنظیمات پروفایل', icon: LuSettings, color: 'cyan', href: '/dashboard/profile' },
]

function formatDate(value) {
  if (!value) return 'به‌تازگی'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
}

function VideoRow({ item, favorite, onRemove }) {
  const video = item.videos
  if (!video) return null
  return (
    <article className="user-dashboard-section-row">
      <a className="user-dashboard-video-item" href={'/video/' + video.slug}>
        <img src={video.cover_url || '/covers/cover-1.svg'} alt="" loading="lazy" />
        <span className="user-dashboard-video-copy">
          <strong>{video.title}</strong>
          <small>{favorite ? 'ذخیره‌شده در علاقه‌مندی‌ها' : 'آخرین بازدید: ' + formatDate(item.last_watched_at)}</small>
        </span>
        <span className="user-dashboard-item-arrow"><LuArrowLeft /></span>
      </a>
      {favorite && <button className="user-dashboard-remove-button" type="button" onClick={() => onRemove(item)} aria-label={'حذف ' + video.title + ' از علاقه‌مندی‌ها'}>حذف از ذخیره‌ها</button>}
    </article>
  )
}

function UserDashboardSection({ section }) {
  const [user, setUser] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const session = await userAuth.getValidSession()
        if (!session?.user) {
          window.location.replace('/login?next=' + encodeURIComponent(window.location.pathname))
          return
        }
        const dashboard = await userLearning.getDashboardData()
        if (!active) return
        setUser(session.user)
        setData(dashboard)
        setName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || '')
      } catch (err) {
        if (active) setError(err.message || 'دریافت اطلاعات انجام نشد.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [section])

  async function removeFavorite(item) {
    try {
      await userLearning.setFavorite(item.videos.id, false)
      setData((current) => ({
        ...current,
        favorites: current.favorites.filter((favorite) => favorite.id !== item.id),
        stats: { ...current.stats, favoriteCount: Math.max(0, current.stats.favoriteCount - 1) },
      }))
      setNotice('ویدیو از علاقه‌مندی‌ها حذف شد.')
    } catch (err) {
      setError(err.message || 'حذف ویدیو انجام نشد.')
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updatedUser = await userAuth.updateProfile({ full_name: name.trim() })
      setUser((current) => ({ ...current, user_metadata: updatedUser.user_metadata || { ...current.user_metadata, full_name: name.trim() } }))
      setNotice('نام نمایشی با موفقیت ذخیره شد.')
    } catch (err) {
      setError(err.message || 'ذخیره پروفایل انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    await userAuth.signOut()
    window.location.replace('/')
  }

  if (loading) return <div className="user-dashboard-loading">در حال بارگذاری فضای کاربری...</div>
  if (!user) return <div className="user-dashboard-loading">{error || 'در حال انتقال به صفحه ورود...'}</div>

  const current = sections[section]
  const favorites = data?.favorites || []
  const history = data?.progress || []
  const courses = data?.courses || []
  const stats = data?.stats || { viewedCount: 0, completedCount: 0, favoriteCount: 0, courseCount: 0 }
  const completion = stats.viewedCount ? Math.round(stats.completedCount / stats.viewedCount * 100) : 0
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'کاربر چارت مسترز'

  return (
    <section className="user-dashboard" dir="rtl">
      <div className="user-dashboard-layout">
        <aside className="user-dashboard-sidebar">
          <a className="user-dashboard-side-brand" href="/dashboard">
            <span className="user-dashboard-brand-mark">CM</span>
            <div><strong>CHARTMASTERS</strong><small>فضای یادگیری تو</small></div>
          </a>
          <span className="user-dashboard-side-label">حساب کاربری</span>
          <nav className="user-dashboard-nav" aria-label="منوی داشبورد">
            {navigation.map((item) => (
              <a key={item.id} href={item.href} className={'user-dashboard-nav-link ' + (item.id === section ? 'active' : '')}>
                <span className={"user-dashboard-nav-icon icon-tone-" + item.color} aria-hidden="true"><item.icon /></span>{item.label}
                {item.id === section && <span className="user-dashboard-nav-indicator" />}
              </a>
            ))}
          </nav>
          <div className="user-dashboard-sidebar-bottom">
            <div className="user-dashboard-help"><span className="user-dashboard-help-icon"><LuSparkles /></span><strong>یادگیری رو ادامه بده</strong><p>هر جلسه تو رو به هدفت نزدیک‌تر می‌کنه.</p><a href="/videos">مشاهده آموزش‌ها ←</a></div>
            <button className="user-dashboard-sidebar-logout" type="button" onClick={signOut}><span className="user-dashboard-logout-icon"><LuLogOut /></span> خروج از حساب</button>
          </div>
        </aside>

        <div className="user-dashboard-main">
          <header className="user-dashboard-topbar">
            <div><span className="user-dashboard-eyebrow">PERSONAL LEARNING SPACE</span><h1>{current.title}</h1></div>
            <div className="user-dashboard-top-user">
              {user.user_metadata?.avatar_url || user.user_metadata?.picture
                ? <img className="user-dashboard-avatar" src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="" referrerPolicy="no-referrer" />
                : <div className="user-dashboard-avatar user-dashboard-avatar-fallback">{displayName.slice(0, 1)}</div>}
              <div><strong>{displayName}</strong><span>{user.email}</span></div>
            </div>
          </header>

          <section className="user-dashboard-section-intro">
            <span className="user-dashboard-section-kicker">{current.kicker}</span>
            <h2>{current.title}</h2>
            <p>{current.description}</p>
          </section>

          {error && <div className="user-dashboard-error" role="alert">{error}</div>}
          {notice && <div className="user-dashboard-notice" role="status">{notice}</div>}

          {section === 'favorites' && (
            <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">YOUR BOOKMARKS</span><h3>{favorites.length} ویدیوی ذخیره‌شده</h3></div></div>
              {favorites.length ? <div className="user-dashboard-section-list">{favorites.map((item) => <VideoRow key={item.id} item={item} favorite onRemove={removeFavorite} />)}</div> : <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon icon-tone-rose"><LuHeart /></span><strong>هنوز ویدیویی ذخیره نکردی</strong><p>در صفحه هر ویدیو روی افزودن به علاقه‌مندی‌ها بزن تا بعداً راحت پیدایش کنی.</p><a href="/videos">گشت‌وگذار در آموزش‌ها</a></div>}
            </section>
          )}

          {section === 'history' && (
            <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">RECENTLY WATCHED</span><h3>{history.length} ویدیو در تاریخچه</h3></div></div>
              {history.length ? <div className="user-dashboard-section-list">{history.map((item) => <VideoRow key={item.id} item={item} />)}</div> : <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon icon-tone-amber"><LuClock3 /></span><strong>تاریخچه‌ات هنوز خالیه</strong><p>با بازکردن ویدیوهای آموزشی، تاریخچه تماشای تو اینجا ثبت می‌شه.</p><a href="/videos">مشاهده ویدیوها</a></div>}
            </section>
          )}

          {section === 'courses' && (
            <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">COURSE LIBRARY</span><h3>{courses.length} دوره شروع‌شده</h3></div></div>
              {courses.length ? <div className="user-dashboard-section-list">{courses.map((course) => (
                <article className="user-dashboard-course-card" key={course.id}>
                  <img src={course.cover_url || '/covers/cover-1.svg'} alt="" loading="lazy" />
                  <div className="user-dashboard-course-card-copy"><strong>{course.title}</strong><span>{course.completedLessons} از {course.totalLessons} جلسه تکمیل‌شده</span><div className="user-dashboard-progress-track"><span style={{ width: course.progressPercent + '%' }} /></div><small>{course.progressPercent}٪ پیشرفت</small></div>
                  <a href={course.firstVideoSlug ? '/video/' + encodeURIComponent(course.firstVideoSlug) : '/videos'} className="user-dashboard-course-open">مشاهده دوره ←</a>
                </article>
              ))}</div> : <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon icon-tone-blue"><LuBookOpen /></span><strong>هنوز دوره‌ای شروع نکردی</strong><p>با تماشای اولین جلسه یک دوره، آن دوره به این بخش اضافه می‌شه.</p><a href="/videos">انتخاب یک دوره</a></div>}
            </section>
          )}

          {section === 'progress' && (
            <>
              <section className="user-dashboard-stats user-dashboard-section-stats">
                <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-cyan"><LuPlay /></span><div><span>ویدیوهای دیده‌شده</span><strong>{stats.viewedCount}</strong><small>در تاریخچه تماشا</small></div></article>
                <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-mint"><LuCircleCheck /></span><div><span>تکمیل‌شده</span><strong>{stats.completedCount}</strong><small>با تأیید خودت</small></div></article>
                <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-blue"><LuBookOpen /></span><div><span>دوره‌های فعال</span><strong>{stats.courseCount}</strong><small>دوره‌های شروع‌شده</small></div></article>
                <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-violet"><LuChartNoAxesCombined /></span><div><span>نرخ تکمیل بازدیدها</span><strong>{completion}٪</strong><small>از ویدیوهای ثبت‌شده</small></div></article>
              </section>
              <section className="user-dashboard-panel user-dashboard-full-panel">
                <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">COURSE COMPLETION</span><h3>پیشرفت دوره‌ها</h3></div></div>
                {courses.length ? <div className="user-dashboard-course-progress user-dashboard-course-progress-expanded">{courses.map((course) => <div className="user-dashboard-course-progress-item" key={course.id}><div><strong>{course.title}</strong><span>{course.completedLessons}/{course.totalLessons} جلسه · {course.progressPercent}٪</span></div><div className="user-dashboard-progress-track"><span style={{ width: course.progressPercent + '%' }} /></div></div>)}</div> : <div className="user-dashboard-compact-empty">بعد از شروع یک دوره، میزان پیشرفت آن در این قسمت نمایش داده می‌شود.</div>}
              </section>
              <section className="user-dashboard-panel user-dashboard-full-panel">
                <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">COMPLETED VIDEOS</span><h3>ویدیوهای تکمیل‌شده</h3></div></div>
                {history.filter((item) => item.is_completed).length ? <div className="user-dashboard-section-list">{history.filter((item) => item.is_completed).map((item) => <VideoRow key={item.id} item={item} />)}</div> : <div className="user-dashboard-compact-empty">هنوز ویدیویی را به‌عنوان تکمیل‌شده علامت نزده‌ای.</div>}
              </section>
            </>
          )}

          {section === 'profile' && (
            <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">PROFILE INFORMATION</span><h3>اطلاعات حساب</h3></div></div>
              <form className="user-dashboard-profile-form" onSubmit={saveProfile}>
                <label htmlFor="profile-name">نام نمایشی</label>
                <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="نامی که در داشبورد نمایش داده می‌شود" />
                <label htmlFor="profile-email">ایمیل حساب</label>
                <input id="profile-email" value={user.email || ''} readOnly />
                <small>ایمیل از حساب گوگل دریافت می‌شود و از این قسمت قابل تغییر نیست.</small>
                <button type="submit" disabled={saving || !name.trim()}>{saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button>
              </form>
            </section>
          )}

          <p className="user-dashboard-data-note">اطلاعات این بخش به حساب کاربری تو متصل است و با ورود دوباره هم باقی می‌ماند.</p>
        </div>
      </div>
    </section>
  )
}

export default UserDashboardSection
