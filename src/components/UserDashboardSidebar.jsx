import { useEffect, useState } from 'react'
import { LuLayoutDashboard, LuBookOpen, LuHeart, LuHistory, LuTrendingUp, LuSettings, LuLogOut, LuLifeBuoy, LuMenu } from 'react-icons/lu'
import '../user-dashboard.css'

const DASHBOARD_NAVIGATION = [
  { id: 'overview', label: 'نمای کلی', icon: LuLayoutDashboard, href: '/dashboard' },
  { id: 'courses', label: 'دوره‌های من', icon: LuBookOpen, href: '/dashboard/courses' },
  { id: 'favorites', label: 'علاقه‌مندی‌ها', icon: LuHeart, href: '/dashboard/favorites' },
  { id: 'history', label: 'تاریخچه تماشا', icon: LuHistory, href: '/dashboard/history' },
  { id: 'progress', label: 'پیشرفت یادگیری', icon: LuTrendingUp, href: '/dashboard/progress' },
  { id: 'profile', label: 'تنظیمات پروفایل', icon: LuSettings, href: '/dashboard/profile' },
  { id: 'support', label: 'تیکت‌های پشتیبانی', icon: LuLifeBuoy, href: '/dashboard/support' },
]

// در موبایل چهار مقصد اصلی در نوار پایین هستند و بقیه از دکمهٔ «منو» باز می‌شوند.
const MOBILE_PRIMARY = ['overview', 'courses', 'favorites', 'progress']

function UserDashboardSidebar({ active, onSignOut, user }) {
  const [open, setOpen] = useState(false)
  const metadata = user?.user_metadata || {}
  const displayName = metadata.full_name || metadata.name || user?.email?.split('@')[0] || ''
  const avatar = metadata.avatar_url || metadata.picture || ''

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const primaryItems = DASHBOARD_NAVIGATION.filter((item) => MOBILE_PRIMARY.includes(item.id))
  const moreActive = !MOBILE_PRIMARY.includes(active)

  return (
    <>
      <aside id="user-dashboard-sidebar" className={'user-dashboard-sidebar ' + (open ? 'is-open' : '')} aria-label="منوی داشبورد">
        <a className="user-dashboard-side-brand" href="/dashboard">
          <span className="user-dashboard-brand-mark">CM</span>
          <strong>چارت مسترز</strong>
        </a>
        <nav className="user-dashboard-nav" aria-label="منوی داشبورد">
          {DASHBOARD_NAVIGATION.map((item) => (
            <a key={item.id} href={item.href} className={'user-dashboard-nav-link ' + (item.id === active ? 'active' : '')} aria-current={item.id === active ? 'page' : undefined} onClick={() => setOpen(false)}>
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="user-dashboard-sidebar-bottom">
          {user && (
            <div className="user-dashboard-side-user">
              {avatar
                ? <img className="user-dashboard-avatar" src={avatar} alt="" referrerPolicy="no-referrer" />
                : <span className="user-dashboard-avatar user-dashboard-avatar-fallback" aria-hidden="true">{displayName.slice(0, 1)}</span>}
              <div><strong>{displayName}</strong><small dir="ltr">{user.email}</small></div>
            </div>
          )}
          <button className="user-dashboard-sidebar-logout" type="button" onClick={onSignOut}><LuLogOut aria-hidden="true" /> <span>خروج از حساب</span></button>
        </div>
      </aside>

      {open && <button type="button" className="user-dashboard-sheet-backdrop" aria-label="بستن منو" onClick={() => setOpen(false)} />}

      <nav className="user-dashboard-bottom-nav" aria-label="ناوبری سریع">
        {primaryItems.map((item) => (
          <a key={item.id} href={item.href} className={item.id === active ? 'active' : ''} aria-current={item.id === active ? 'page' : undefined}>
            <item.icon aria-hidden="true" />
            <span>{item.label.replace('های من', 'ها').replace('پیشرفت یادگیری', 'پیشرفت')}</span>
          </a>
        ))}
        <button type="button" className={moreActive || open ? 'active' : ''} aria-expanded={open} aria-controls="user-dashboard-sidebar" onClick={() => setOpen((value) => !value)}>
          <LuMenu aria-hidden="true" />
          <span>منو</span>
        </button>
      </nav>
    </>
  )
}

export default UserDashboardSidebar
