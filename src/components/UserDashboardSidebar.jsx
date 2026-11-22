import { useState } from 'react'
import { LuLayoutDashboard, LuBookOpen, LuHeart, LuHistory, LuTrendingUp, LuSettings, LuLogOut, LuLifeBuoy } from 'react-icons/lu'

const DASHBOARD_NAVIGATION = [
  { id: 'overview', label: 'نمای کلی', icon: LuLayoutDashboard, color: 'mint', href: '/dashboard' },
  { id: 'courses', label: 'دوره‌های من', icon: LuBookOpen, color: 'blue', href: '/dashboard/courses' },
  { id: 'favorites', label: 'علاقه‌مندی‌ها', icon: LuHeart, color: 'rose', href: '/dashboard/favorites' },
  { id: 'history', label: 'تاریخچه تماشا', icon: LuHistory, color: 'amber', href: '/dashboard/history' },
  { id: 'progress', label: 'پیشرفت یادگیری', icon: LuTrendingUp, color: 'violet', href: '/dashboard/progress' },
  { id: 'profile', label: 'تنظیمات پروفایل', icon: LuSettings, color: 'cyan', href: '/dashboard/profile' },
  { id: 'support', label: 'تیکت‌های پشتیبانی', icon: LuLifeBuoy, color: 'mint', href: '/dashboard/support' },
]

// سایدبار مشترک همهٔ صفحه‌های داشبورد؛ در موبایل با دکمهٔ «منوی داشبورد» باز و بسته می‌شود
// (دکمه فقط در موبایل دیده می‌شود و داخل grid قرار می‌گیرد)
function UserDashboardSidebar({ active, onSignOut }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="user-dashboard-mobile-toggle" type="button" aria-expanded={open} aria-controls="user-dashboard-sidebar" onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">☰</span> منوی داشبورد
      </button>
      <aside id="user-dashboard-sidebar" className={'user-dashboard-sidebar ' + (open ? 'is-open' : '')}>
        <a className="user-dashboard-side-brand" href="/dashboard">
          <span className="user-dashboard-brand-mark">CM</span>
          <div><strong>CHARTMASTERS</strong><small>فضای یادگیری تو</small></div>
        </a>
        <span className="user-dashboard-side-label">حساب کاربری</span>
        <nav className="user-dashboard-nav" aria-label="منوی داشبورد">
          {DASHBOARD_NAVIGATION.map((item) => (
            <a key={item.id} href={item.href} className={'user-dashboard-nav-link ' + (item.id === active ? 'active' : '')} aria-current={item.id === active ? 'page' : undefined} onClick={() => setOpen(false)}>
              <span className={'user-dashboard-nav-icon icon-tone-' + item.color} aria-hidden="true"><item.icon /></span>
              {item.label}
              {item.id === active && <span className="user-dashboard-nav-indicator" />}
            </a>
          ))}
        </nav>
        <div className="user-dashboard-sidebar-bottom">
          <button className="user-dashboard-sidebar-logout" type="button" onClick={onSignOut}><span className="user-dashboard-logout-icon"><LuLogOut /></span> خروج از حساب</button>
        </div>
      </aside>
    </>
  )
}

export default UserDashboardSidebar
