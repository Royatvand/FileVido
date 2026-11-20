import { useEffect, useRef, useState } from 'react'
import AnimatedText from './animated/AnimatedText'
import { userAuth } from '../lib/supabase'
import ThemeToggle from './ThemeToggle'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const headerRef = useRef(null)
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isAbout = path === '/about'
  const isChart = path === '/chart'
  const isIndicators = path === '/indicators' || path.startsWith('/indicator/')
  const isVideos = path === '/videos' || path.startsWith('/video/')

  useEffect(() => {
    let active = true
    userAuth.getValidSession().then((session) => {
      if (active) setSignedIn(Boolean(session?.user))
    }).catch(() => {})
    return () => { active = false }
  }, [])

  // منوی موبایل: با Escape یا کلیک بیرون از هدر بسته می‌شود
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setMenuOpen(false) }
    const onPointer = (event) => { if (headerRef.current && !headerRef.current.contains(event.target)) setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer) }
  }, [menuOpen])

  return (
    <header className="site-header" ref={headerRef}>
      <div className="header-inner">
        <a className="brand" href="/" aria-label="چارت مسترز - ChartMasters home">
          <img className="brand-icon" src="/chartmasters-icon.webp" alt="" aria-hidden="true" />
          <span className="brand-name"><AnimatedText text="Chart" by="char" /><span className="brand-accent"><AnimatedText text="Masters" by="char" offset={5} /></span></span>
        </a>

        <nav className={`main-nav ${menuOpen ? 'open' : ''}`} id="main-nav" aria-label="منوی اصلی">
          <a className={`nav-link ${!isAbout && !isVideos && !isChart && !isIndicators ? 'active' : ''}`} href="/">خانه</a>
          <a className={`nav-link ${isVideos ? 'active' : ''}`} href="/videos">ویدیوها</a>
          <a className={`nav-link ${isChart ? 'active' : ''}`} href="/chart">نمودار</a>
          <a className={`nav-link ${isIndicators ? 'active' : ''}`} href="/indicators">اندیکاتورها</a>
          <a className="nav-link" href="/#categories">دسته‌بندی‌ها</a>
          <a className={`nav-link ${isAbout ? 'active' : ''}`} href="/about">درباره ما</a>
        </nav>

        <div className="header-controls">
          <ThemeToggle />
          <a className="header-login" href={signedIn ? '/dashboard' : '/login'}>{signedIn ? 'داشبورد من' : 'ورود'}</a>
        </div>

        <button type="button" className={`nav-toggle ${menuOpen ? 'open' : ''}`} aria-expanded={menuOpen} aria-controls="main-nav" aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'} onClick={() => setMenuOpen((value) => !value)}>
          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export default Header
