import { useEffect, useState } from 'react'
import { LuBookOpen, LuHeart, LuPlay, LuCircleCheck, LuArrowLeft } from 'react-icons/lu'
import { userAuth, userLearning } from '../lib/supabase'
import UserDashboardSidebar from '../components/UserDashboardSidebar'

function courseActionLabel(course) {
  if (!course.nextLesson) return 'مشاهده دوره'
  return course.completedLessons >= course.totalLessons ? 'مرور دوباره' : 'ادامه از جلسهٔ ' + course.nextLesson.number
}

function UserDashboard() {
  const [user, setUser] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      try {
        const session = await userAuth.getValidSession()
        if (!active) return
        if (!session?.user) {
          window.location.replace('/login?next=/dashboard')
          return
        }
        setUser(session.user)
        const data = await userLearning.getDashboardData()
        if (active) setDashboard(data)
      } catch (error) {
        if (active) setLoadError(error.message || 'دریافت اطلاعات داشبورد انجام نشد.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadDashboard()
    return () => { active = false }
  }, [])

  async function handleSignOut() {
    await userAuth.signOut()
    window.location.replace('/')
  }

  if (loading || !user) return <div className="user-dashboard-loading" role="status" aria-label="در حال بارگذاری"><span className="user-dashboard-spinner" aria-hidden="true" /></div>

  const metadata = user.user_metadata || {}
  const displayName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'کاربر چارت مسترز'
  const avatar = metadata.avatar_url || metadata.picture || ''
  const progress = dashboard?.progress || []
  const courses = dashboard?.courses || []
  const stats = dashboard?.stats || { courseCount: 0, viewedCount: 0, completedCount: 0, favoriteCount: 0 }
  const latestUnfinished = progress.find((item) => !item.is_completed && item.videos)
  const latestVideo = latestUnfinished || progress.find((item) => item.videos)

  const formatDate = (value) => value
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
    : 'به‌تازگی'

  const renderVideoItem = (item, isFavorite = false) => {
    const video = item.videos
    if (!video) return null
    return (
      <a className="user-dashboard-video-item" href={'/video/' + video.slug} key={item.id}>
        <img src={video.cover_url || '/covers/cover-1.svg'} alt="" loading="lazy" />
        <span className="user-dashboard-video-copy">
          <strong>{video.title}</strong>
          <small>{isFavorite ? 'ذخیره‌شده در علاقه‌مندی‌ها' : formatDate(item.last_watched_at || item.created_at)}</small>
        </span>
        <span className="user-dashboard-item-arrow"><LuArrowLeft /></span>
      </a>
    )
  }

  return (
    <section className="user-dashboard" dir="rtl">
      <div className="user-dashboard-layout">
        <UserDashboardSidebar active="overview" onSignOut={handleSignOut} />

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

          {loadError && <div className="user-dashboard-error" role="alert">{loadError}</div>}

          <section className="user-dashboard-stats" aria-label="آمار یادگیری">
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-blue"><LuBookOpen /></span><div><span>دوره‌های فعال</span><strong>{stats.courseCount}</strong><small>دوره‌هایی که شروع کردی</small></div></article>
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-cyan"><LuPlay /></span><div><span>ویدیوهای بازدیدشده</span><strong>{stats.viewedCount}</strong><small>ویدیوهای ثبت‌شده در تاریخچه</small></div></article>
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-mint"><LuCircleCheck /></span><div><span>ویدیوهای تکمیل‌شده</span><strong>{stats.completedCount}</strong><small>تکمیل‌شده توسط خودت</small></div></article>
            <article className="user-dashboard-stat-card"><span className="user-dashboard-stat-icon icon-tone-rose"><LuHeart /></span><div><span>علاقه‌مندی‌ها</span><strong>{stats.favoriteCount}</strong><small>ویدیوهای ذخیره‌شده</small></div></article>
          </section>

          <div className="user-dashboard-content-grid">
            <section className="user-dashboard-panel user-dashboard-continue" id="history">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>ادامه یادگیری</h3></div><a href="/dashboard/history">تاریخچه کامل <span>←</span></a></div>
              {latestVideo ? (
                <div className="user-dashboard-latest">
                  <a href={'/video/' + latestVideo.videos.slug} className="user-dashboard-latest-cover"><img src={latestVideo.videos.cover_url || '/covers/cover-1.svg'} alt="" /><span>▶</span></a>
                  <div className="user-dashboard-latest-copy">
                    <small>{latestVideo.is_completed ? 'آخرین ویدیوی تکمیل‌شده' : 'آخرین ویدیوی بازدیدشده'}</small>
                    <strong>{latestVideo.videos.title}</strong>
                    <span>آخرین بازدید: {formatDate(latestVideo.last_watched_at)}</span>
                    <a href={'/video/' + latestVideo.videos.slug}>{latestVideo.is_completed ? 'مشاهده دوباره' : 'ادامه آموزش'} ←</a>
                  </div>
                </div>
              ) : (
                <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon icon-tone-mint"><LuPlay /></span><strong>هنوز آموزشی رو شروع نکردی</strong><p>با بازکردن یک ویدیو، سابقه بازدیدت از اینجا ثبت می‌شه.</p><a href="/videos">رفتن به کتابخانه آموزش‌ها</a></div>
              )}
              {progress.filter((item) => item !== latestVideo).length > 0 && <div className="user-dashboard-list">{progress.filter((item) => item !== latestVideo).slice(0, 4).map((item) => renderVideoItem(item))}</div>}
            </section>

            <section className="user-dashboard-panel" id="courses">
              <div className="user-dashboard-panel-heading"><div><span className="user-dashboard-section-kicker">YOUR COURSES</span><h3>دوره‌های من</h3></div><a href="/dashboard/courses">همه دوره‌ها <span>←</span></a></div>
              {courses.length ? <div className="user-dashboard-list">{courses.map((course) => <a className="user-dashboard-video-item" href={course.nextLesson ? '/video/' + course.nextLesson.slug : '/videos'} key={course.id}><img src={course.cover_url || '/covers/cover-1.svg'} alt="" /><span className="user-dashboard-video-copy"><strong>{course.title}</strong><small>{course.completedLessons} از {course.totalLessons} جلسه تکمیل‌شده · {courseActionLabel(course)}</small></span><span className="user-dashboard-item-arrow"><LuArrowLeft /></span></a>)}</div> : <div className="user-dashboard-compact-empty">با بازدید از یکی از ویدیوهای یک دوره، آن دوره به این بخش اضافه می‌شه.</div>}
            </section>

          </div>
          <p className="user-dashboard-data-note">اطلاعات این صفحه از فعالیت‌های ثبت‌شده در حساب کاربری تو دریافت می‌شه.</p>
        </div>
      </div>
    </section>
  )
}

export default UserDashboard
