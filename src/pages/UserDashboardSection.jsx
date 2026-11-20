import { useEffect, useState } from 'react'
import { LuBookOpen, LuHeart, LuPlay, LuCircleCheck, LuArrowLeft, LuChartNoAxesCombined, LuClock3 } from 'react-icons/lu'
import { userAuth, userLearning } from '../lib/supabase'
import UserDashboardSidebar from '../components/UserDashboardSidebar'
import UserDeviceSessions from '../components/UserDeviceSessions'
import FontPicker from '../components/FontPicker'
import useUserDashboard from '../hooks/useUserDashboard'

const sections = {
  favorites: { title: 'علاقه‌مندی‌های من', description: 'ویدیوهایی که برای تماشای دوباره ذخیره کرده‌ای.' },
  history: { title: 'تاریخچه تماشا', description: 'ویدیوهایی که باز کرده‌ای؛ از آخرین بازدید به قدیمی‌تر.' },
  courses: { title: 'دوره‌های من', description: 'دوره‌هایی که با تماشای یکی از جلسه‌هایشان شروع کرده‌ای.' },
  progress: { title: 'پیشرفت یادگیری', description: 'نمای کلی از جلسه‌های تکمیل‌شده و مسیر دوره‌ها.' },
  profile: { title: 'تنظیمات پروفایل', description: 'نام نمایشی و فونت سایت را برای حساب خودت تنظیم کن.' },
}

function courseActionLabel(course) {
  if (!course.nextLesson) return 'مشاهده دوره'
  return course.completedLessons >= course.totalLessons ? 'مرور دوباره' : 'ادامه از جلسهٔ ' + course.nextLesson.number
}

function formatDate(value) {
  if (!value) return 'به‌تازگی'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
}


const jalaliMonthName = (date) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short' }).format(date)

function LearningActivityHeatmap({ history }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 363)
  // هفته‌ها از شنبه شروع می‌شوند؛ خانه‌های خالی ابتدای سال فقط برای تراز تقویم‌اند.
  start.setDate(start.getDate() - ((start.getDay() + 1) % 7))

  const activity = new Map()
  history.forEach((item) => {
    const value = item.last_watched_at || item.created_at
    if (!value) return
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return
    const key = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()
    activity.set(key, (activity.get(key) || 0) + 1)
  })

  const days = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const key = cursor.getFullYear() + '-' + cursor.getMonth() + '-' + cursor.getDate()
    days.push({ date: new Date(cursor), count: activity.get(key) || 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  while (days.length % 7) days.push({ date: null, count: 0 })

  const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7))
  const activeDays = days.filter((day) => day.date && day.count > 0).length
  const totalActivities = days.reduce((sum, day) => sum + day.count, 0)
  const monthLabels = weeks.map((week, index) => {
    const first = week.find((day) => day.date)
    if (!first) return ''
    const month = jalaliMonthName(first.date)
    const previous = index ? weeks[index - 1].find((day) => day.date) : null
    return !previous || jalaliMonthName(previous.date) !== month ? month : ''
  })
  const level = (count) => count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4

  return (
    <section className="learning-activity-card">
      <div className="learning-activity-heading">
        <div><h3>نقشه فعالیت روزانه</h3><p>هر خانه نشان‌دهنده تعداد ویدیوهایی است که در آن روز تماشا کرده‌ای.</p></div>
        <div className="learning-activity-totals"><strong>{activeDays.toLocaleString('fa-IR')}</strong><span>روز فعال در یک سال اخیر</span></div>
      </div>
      <div className="learning-heatmap-scroll" dir="ltr">
        <div className="learning-heatmap-months">{monthLabels.map((month, index) => <span key={index}>{month}</span>)}</div>
        <div className="learning-heatmap-body">
          <div className="learning-heatmap-weekdays"><span>ش</span><span>ی</span><span>د</span><span>س</span><span>چ</span><span>پ</span><span>ج</span></div>
          <div className="learning-heatmap-grid">
            {weeks.map((week, weekIndex) => <div className="learning-heatmap-week" key={weekIndex}>
              {week.map((day, dayIndex) => <span key={dayIndex} className={day.date ? 'learning-heatmap-cell level-' + level(day.count) : 'learning-heatmap-cell is-empty'} title={day.date ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(day.date) + ' · ' + day.count.toLocaleString('fa-IR') + ' ویدیو' : ''} />)}
            </div>)}
          </div>
        </div>
      </div>
      <div className="learning-activity-footer"><span>{totalActivities.toLocaleString('fa-IR')} بازدید ثبت‌شده</span><div className="learning-heatmap-legend"><span>کم</span>{[0,1,2,3,4].map((value) => <i className={'level-' + value} key={value} />)}<span>زیاد</span></div></div>
    </section>
  )
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
  const { user, setUser, data, setData, loading, error, setError, signOut } = useUserDashboard()
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (user) setName(user.user_metadata?.full_name || user.user_metadata?.name || '')
  }, [user])

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

  if (loading) return <div className="user-dashboard-loading" role="status" aria-label="در حال بارگذاری"><span className="user-dashboard-spinner" aria-hidden="true" /></div>
  if (!user) return error ? <div className="user-dashboard-loading" role="alert">{error}</div> : <div className="user-dashboard-loading" role="status" aria-label="در حال انتقال به صفحه ورود"><span className="user-dashboard-spinner" aria-hidden="true" /></div>

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
        <UserDashboardSidebar active={section} onSignOut={signOut} />

        <div className="user-dashboard-main">
          <header className="user-dashboard-topbar">
            <div><h1>{current.title}</h1></div>
            <div className="user-dashboard-top-user">
              {user.user_metadata?.avatar_url || user.user_metadata?.picture
                ? <img className="user-dashboard-avatar" src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="" referrerPolicy="no-referrer" />
                : <div className="user-dashboard-avatar user-dashboard-avatar-fallback">{displayName.slice(0, 1)}</div>}
              <div><strong>{displayName}</strong><span>{user.email}</span></div>
            </div>
          </header>

          <section className="user-dashboard-section-intro">
            
            <h2>{current.title}</h2>
            <p>{current.description}</p>
          </section>

          {error && <div className="user-dashboard-error" role="alert">{error}</div>}
          {notice && <div className="user-dashboard-notice" role="status">{notice}</div>}

          {section === 'favorites' && (
            <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><h3>{favorites.length} ویدیوی ذخیره‌شده</h3></div></div>
              {favorites.length ? <div className="user-dashboard-section-list">{favorites.map((item) => <VideoRow key={item.id} item={item} favorite onRemove={removeFavorite} />)}</div> : <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon icon-tone-rose"><LuHeart /></span><strong>هنوز ویدیویی ذخیره نکردی</strong><p>در صفحه هر ویدیو روی افزودن به علاقه‌مندی‌ها بزن تا بعداً راحت پیدایش کنی.</p><a href="/videos">گشت‌وگذار در آموزش‌ها</a></div>}
            </section>
          )}

          {section === 'history' && (
            <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><h3>{history.length} ویدیو در تاریخچه</h3></div></div>
              {history.length ? <div className="user-dashboard-section-list">{history.map((item) => <VideoRow key={item.id} item={item} />)}</div> : <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon icon-tone-amber"><LuClock3 /></span><strong>تاریخچه‌ات هنوز خالیه</strong><p>با بازکردن ویدیوهای آموزشی، تاریخچه تماشای تو اینجا ثبت می‌شه.</p><a href="/videos">مشاهده ویدیوها</a></div>}
            </section>
          )}

          {section === 'courses' && (
            <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><h3>{courses.length} دوره شروع‌شده</h3></div></div>
              {courses.length ? <div className="user-dashboard-section-list">{courses.map((course) => (
                <article className="user-dashboard-course-card" key={course.id}>
                  <img src={course.cover_url || '/covers/cover-1.svg'} alt="" loading="lazy" />
                  <div className="user-dashboard-course-card-copy"><strong>{course.title}</strong><span>{course.completedLessons} از {course.totalLessons} جلسه تکمیل‌شده</span><div className="user-dashboard-progress-track"><span style={{ width: course.progressPercent + '%' }} /></div><small>{course.progressPercent}٪ پیشرفت</small></div>
                  <a href={course.nextLesson ? '/video/' + course.nextLesson.slug : '/videos'} className="user-dashboard-course-open">{courseActionLabel(course)} ←</a>
                </article>
              ))}</div> : <div className="user-dashboard-empty-state"><span className="user-dashboard-empty-icon icon-tone-blue"><LuBookOpen /></span><strong>هنوز دوره‌ای شروع نکردی</strong><p>با تماشای اولین جلسه یک دوره، آن دوره به این بخش اضافه می‌شه.</p><a href="/videos">انتخاب یک دوره</a></div>}
            </section>
          )}

          {section === 'progress' && (
            <>
              <section className="learning-metrics-grid" aria-label="خلاصه پیشرفت یادگیری">
                <article className="learning-metric-card metric-views"><div className="learning-metric-top"><span>ویدیوهای دیده‌شده</span><span className="learning-metric-icon"><LuPlay /></span></div><strong>{stats.viewedCount.toLocaleString('fa-IR')}</strong><div className="learning-metric-bottom"><span>کل بازدیدهای ثبت‌شده</span><i className="learning-mini-bars"><b/><b/><b/><b/><b/><b/><b/></i></div></article>
                <article className="learning-metric-card metric-completed"><div className="learning-metric-top"><span>ویدیوهای تکمیل‌شده</span><span className="learning-metric-icon"><LuCircleCheck /></span></div><strong>{stats.completedCount.toLocaleString('fa-IR')}</strong><div className="learning-metric-bottom"><span>با تأیید خودت</span><i className="learning-metric-track"><b style={{ width: completion + '%' }} /></i></div></article>
                <article className="learning-metric-card metric-courses"><div className="learning-metric-top"><span>دوره‌های فعال</span><span className="learning-metric-icon"><LuBookOpen /></span></div><strong>{stats.courseCount.toLocaleString('fa-IR')}</strong><div className="learning-metric-bottom"><span>دوره‌های شروع‌شده</span><i className="learning-mini-bars"><b/><b/><b/><b/><b/><b/><b/></i></div></article>
                <article className="learning-metric-card metric-rate"><div className="learning-metric-top"><span>نرخ تکمیل</span><span className="learning-metric-icon"><LuChartNoAxesCombined /></span></div><strong>{completion.toLocaleString('fa-IR')}<small>٪</small></strong><div className="learning-metric-bottom"><span>از کل ویدیوهای دیده‌شده</span><i className="learning-metric-track"><b style={{ width: completion + '%' }} /></i></div></article>
              </section>
              <LearningActivityHeatmap history={history} />
              <section className="user-dashboard-panel user-dashboard-full-panel">
                <div className="user-dashboard-panel-heading"><div><h3>پیشرفت دوره‌ها</h3></div></div>
                {courses.length ? <div className="user-dashboard-course-progress user-dashboard-course-progress-expanded">{courses.map((course) => <div className="user-dashboard-course-progress-item" key={course.id}><div><strong>{course.title}</strong><span>{course.completedLessons}/{course.totalLessons} جلسه · {course.progressPercent}٪</span></div><div className="user-dashboard-progress-track"><span style={{ width: course.progressPercent + '%' }} /></div></div>)}</div> : <div className="user-dashboard-compact-empty">بعد از شروع یک دوره، میزان پیشرفت آن در این قسمت نمایش داده می‌شود.</div>}
              </section>
              <section className="user-dashboard-panel user-dashboard-full-panel">
                <div className="user-dashboard-panel-heading"><div><h3>ویدیوهای تکمیل‌شده</h3></div></div>
                {history.filter((item) => item.is_completed).length ? <div className="user-dashboard-section-list">{history.filter((item) => item.is_completed).map((item) => <VideoRow key={item.id} item={item} />)}</div> : <div className="user-dashboard-compact-empty">هنوز ویدیویی را به‌عنوان تکمیل‌شده علامت نزده‌ای.</div>}
              </section>
            </>
          )}

          {section === 'profile' && (
            <>
              <section className="user-dashboard-panel user-dashboard-full-panel">
                <FontPicker
                  onSaved={(updatedUser) => setUser((current) => ({ ...current, user_metadata: updatedUser.user_metadata || { ...current.user_metadata, ui_font: updatedUser.user_metadata?.ui_font } }))}
                  onError={setError}
                  onNotice={setNotice}
                />
              </section>
              <section className="user-dashboard-panel user-dashboard-full-panel">
              <div className="user-dashboard-panel-heading"><div><h3>اطلاعات حساب</h3></div></div>
              <form className="user-dashboard-profile-form" onSubmit={saveProfile}>
                <label htmlFor="profile-name">نام نمایشی</label>
                <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="نامی که در داشبورد نمایش داده می‌شود" />
                <label htmlFor="profile-email">ایمیل حساب</label>
                <input id="profile-email" value={user.email || ''} readOnly />
                <small>ایمیل از حساب گوگل دریافت می‌شود و از این قسمت قابل تغییر نیست.</small>
                <button type="submit" disabled={saving || !name.trim()}>{saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button>
              </form>
              <UserDeviceSessions />
            </section>
            </>
          )}

          <p className="user-dashboard-data-note">اطلاعات این بخش به حساب کاربری تو متصل است و با ورود دوباره هم باقی می‌ماند.</p>
        </div>
      </div>
    </section>
  )
}

export default UserDashboardSection
