function Header() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isAbout = path === '/about'
  const isVideos = path === '/videos' || path.startsWith('/video/')

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="TradeFarsi home">
          <span className="brand-mark">T<span>.</span></span>
          <span className="brand-name">Trade<span>Farsi</span></span>
        </a>

        <nav className="main-nav" aria-label="منوی اصلی">
          <a className={`nav-link ${!isAbout && !isVideos ? 'active' : ''}`} href="/">خانه</a>
          <a className={`nav-link ${isVideos ? 'active' : ''}`} href="/videos">ویدیوها</a>
          <a className="nav-link" href="/#categories">دسته‌بندی‌ها</a>
          <a className={`nav-link ${isAbout ? 'active' : ''}`} href="/about">درباره ما</a>
        </nav>

        <a className="header-action" href="/#videos">
          شروع یادگیری <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>
  )
}

export default Header
