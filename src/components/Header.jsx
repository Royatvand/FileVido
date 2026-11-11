import AnimatedText from './animated/AnimatedText'
import { supabase } from '../lib/supabase'

function Header() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isLogin = path === '/login'
  const loggedIn = Boolean(supabase.getUserSession())
  const isAbout = path === '/about'
  const isVideos = path === '/videos' || path.startsWith('/video/')

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="چارت مسترز - ChartMasters home">
          <img className="brand-icon" src="/chartmasters-icon.webp" alt="" aria-hidden="true" />
          <span className="brand-name"><AnimatedText text="Chart" by="char" /><span className="brand-accent"><AnimatedText text="Masters" by="char" offset={5} /></span></span>
        </a>

        <nav className="main-nav" aria-label="منوی اصلی">
          <a className={`nav-link ${!isAbout && !isVideos ? 'active' : ''}`} href="/">خانه</a>
          <a className={`nav-link ${isVideos ? 'active' : ''}`} href="/videos">ویدیوها</a>
          <a className="nav-link" href="/#categories">دسته‌بندی‌ها</a>
          <a className={`nav-link ${isAbout ? 'active' : ''}`} href="/about">درباره ما</a>
        </nav>

        <div className="header-actions">
          <a className={`header-login ${isLogin ? 'active' : ''}`} href="/login">{loggedIn ? 'حساب من' : 'ورود'}</a>
          <a className="header-action" href="/#videos">
            شروع یادگیری <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  )
}

export default Header
