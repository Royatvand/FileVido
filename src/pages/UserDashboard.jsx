import { LuBookOpen, LuHeart, LuPlay, LuCircleCheck, LuArrowLeft, LuGraduationCap } from 'react-icons/lu'
import UserDashboardSidebar from '../components/UserDashboardSidebar'
import useUserDashboard from '../hooks/useUserDashboard'

function courseActionLabel(course) {
  if (!course.nextLesson) return 'مشاهده دوره'
  return course.completedLessons >= course.totalLessons ? 'مرور دوباره' : 'ادامه از جلسهٔ ' + course.nextLesson.number
}

function UserDashboard() {
  const { user, data: dashboard, loading, error: loadError, signOut } = useUserDashboard()

  if (loading || !user) return <div className="user-dashboard-loading" role="status" aria-label="در حال بارگذاری"><span className="user-dashboard-spinner" aria-hidden="true" /></div>

  const metadata = user.user_metadata || {}
  const displayName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'کاربر چارت مسترز'
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
        <span className="user-dashboard-item-arrow"><LuArrowLeft aria-hidden="true" /></span>
      </a>
    )
  }

  const recentItems = progress.filter((item) => item !== latestVideo && item.videos).slice(0, 4)

  return (
    <section className="user-dashboard" dir="rtl">
      <div className="user-dashboard-layout">
        <UserDashboardSidebar active="overview" onSignOut={signOut} user={user} />

        <div className="user-dashboard-main">
          <header className="user-dashboard-topbar">
            <div>
              <h1>سلام {displayName.split(' ')[0]}، خوش برگشتی</h1>
              <p>یادگیری را از همان‌جایی که متوقف کردی ادامه بده.</p>
            </div>
            <a href="/videos" className="user-dashboard-primary-link">کتابخانه آموزش‌ها <LuArrowLeft aria-hidden="true" /></a>
          </header>

          {loadError && <div className="user-dashboard-error" role="alert">{loadError}</div>}

          <section className="user-dashboard-continue-card" id="history" aria-label="ادامه یادگیری">
            {latestVideo ? (
              <>
                <a href={'/video/' + latestVideo.videos.slug} className="user-dashboard-latest-cover" aria-label={'پخش ' + latestVideo.videos.title}>
                  <img src={latestVideo.videos.cover_url || '/covers/cover-1.svg'} alt="" />
                  <span><LuPlay aria-hidden="true" /></span>
                </a>
                <div className="user-dashboard-latest-copy">
                  <small>{latestVideo.is_completed ? 'آخرین ویدیوی تکمیل‌شده' : 'ادامه یادگیری'}</small>
                  <strong>{latestVideo.videos.title}</strong>
                  <span>آخرین بازدید: {formatDate(latestVideo.last_watched_at)}</span>
                  <a className="user-dashboard-primary-link" href={'/video/' + latestVideo.videos.slug}>{latestVideo.is_completed ? 'مشاهده دوباره' : 'ادامه آموزش'} <LuArrowLeft aria-hidden="true" /></a>
                </div>
              </>
            ) : (
              <div className="user-dashboard-empty-state">
                <span className="user-dashboard-empty-icon"><LuPlay aria-hidden="true" /></span>
                <strong>هنوز آموزشی را شروع نکرده‌ای</strong>
                <p>با باز کردن یک ویدیو، سابقه‌ی تماشایت از اینجا ثبت می‌شود.</p>
                <a className="user-dashboard-primary-link" href="/videos">رفتن به کتابخانه آموزش‌ها</a>
              </div>
            )}
          </section>

          <section className="user-dashboard-stats" aria-label="آمار یادگیری">
            <article className="user-dashboard-stat-card"><LuBookOpen aria-hidden="true" /><strong>{stats.courseCount.toLocaleString('fa-IR')}</strong><span>دوره‌ی فعال</span></article>
            <article className="user-dashboard-stat-card"><LuPlay aria-hidden="true" /><strong>{stats.viewedCount.toLocaleString('fa-IR')}</strong><span>ویدیوی بازدیدشده</span></article>
            <article className="user-dashboard-stat-card"><LuCircleCheck aria-hidden="true" /><strong>{stats.completedCount.toLocaleString('fa-IR')}</strong><span>ویدیوی تکمیل‌شده</span></article>
            <article className="user-dashboard-stat-card"><LuHeart aria-hidden="true" /><strong>{stats.favoriteCount.toLocaleString('fa-IR')}</strong><span>علاقه‌مندی</span></article>
          </section>

          <div className="user-dashboard-content-grid">
            <section className="user-dashboard-panel" id="courses">
              <div className="user-dashboard-panel-heading"><h3>دوره‌های من</h3><a href="/dashboard/courses">همه دوره‌ها <LuArrowLeft aria-hidden="true" /></a></div>
              {courses.length ? (
                <div className="user-dashboard-list">
                  {courses.map((course) => (
                    <a className="user-dashboard-course-row" href={course.nextLesson ? '/video/' + course.nextLesson.slug : '/videos'} key={course.id}>
                      <img src={course.cover_url || '/covers/cover-1.svg'} alt="" loading="lazy" />
                      <span className="user-dashboard-video-copy">
                        <strong>{course.title}</strong>
                        <span className="user-dashboard-course-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={course.progressPercent} aria-label={'پیشرفت ' + course.title}><i style={{ width: course.progressPercent + '%' }} /></span>
                        <small>{course.completedLessons.toLocaleString('fa-IR')} از {course.totalLessons.toLocaleString('fa-IR')} جلسه · {courseActionLabel(course)}</small>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="user-dashboard-compact-empty"><LuGraduationCap aria-hidden="true" /><span>با دیدن یکی از ویدیوهای یک دوره، آن دوره به اینجا اضافه می‌شود.</span></div>
              )}
            </section>

            <section className="user-dashboard-panel">
              <div className="user-dashboard-panel-heading"><h3>آخرین بازدیدها</h3><a href="/dashboard/history">تاریخچه کامل <LuArrowLeft aria-hidden="true" /></a></div>
              {recentItems.length ? <div className="user-dashboard-list">{recentItems.map((item) => renderVideoItem(item))}</div> : <div className="user-dashboard-compact-empty"><LuPlay aria-hidden="true" /><span>هنوز بازدید دیگری ثبت نشده است.</span></div>}
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}

export default UserDashboard
