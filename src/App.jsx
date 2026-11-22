import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import NotFound from './pages/NotFound'
import VideosSection from './components/VideosSection'
import HomeIndicators from './components/HomeIndicators'
import BannerSlider from './components/BannerSlider'
import AnimatedText from './components/animated/AnimatedText'
import VideoPage from './pages/VideoPage'
import Chart from './pages/Chart'
import Indicators from './pages/Indicators'
import IndicatorPage from './pages/IndicatorPage'
import AdminLogin from './pages/AdminLogin'
import GoogleLogin from './pages/GoogleLogin'
import OAuthConsent from './pages/OAuthConsent'
import UserDashboard from './pages/UserDashboard'
import UserDashboardSection from './pages/UserDashboardSection'
import AdminDashboard from './pages/AdminDashboard'
import { supabase } from './lib/supabase'
import MarketChart from './components/MarketChart'
import ThemeToggle from './components/ThemeToggle'
import AppUpdateModal from './components/AppUpdateModal'
import {
  checkForAppUpdate,
  initAndroidPushNotifications,
  isAndroidNative,
  onAppResume,
} from './lib/appUpdate'
import { useEffect, useState } from 'react'
import { setPageSeo } from './lib/seo'
import { initNativeAuthListener } from './lib/nativeAuth'
import './admin.css'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isHome = path === '/'
  const isAbout = path === '/about'
  const isVideos = path === '/videos'
  const isChart = path === '/chart'
  const isIndicators = path === '/indicators'
  const isUserLogin = path === '/login'
  const isOAuthConsent = path === '/oauth/consent'
  const isUserDashboard = path === '/dashboard'
  const userDashboardSection = path.match(/^\/dashboard\/(favorites|history|courses|progress|profile)$/)?.[1] || null
  const isAdminLogin = path === '/admin/login'
  const isAdmin = path === '/admin'
  const videoMatch = path.match(/^\/video\/([^/]+)$/)
  const videoId = videoMatch ? decodeURIComponent(videoMatch[1]) : null
  const indicatorMatch = path.match(/^\/indicator\/([^/]+)$/)
  const indicatorSlug = indicatorMatch ? decodeURIComponent(indicatorMatch[1]) : null

  const [appUpdate, setAppUpdate] = useState(null)

  useEffect(() => {
    if (isHome) {
      setPageSeo({
        title: 'زیرنویس فارسی آموزش ترید | ویدیوهای ترجمه‌شده ترید - چارت مسترز',
        description: 'در چارت مسترز، ویدیوهای آموزش ترید با زیرنویس فارسی و ترجمه روان ببین؛ آموزش‌های فارکس، پرایس اکشن و بازارهای مالی از منابع آموزشی منتخب.',
        path: '/',
      })
    } else if (isVideos) {
      setPageSeo({
        title: 'ویدیو آموزش ترید با زیرنویس فارسی | آرشیو چارت مسترز',
        description: 'آرشیو ویدیوهای ترید ترجمه‌شده؛ آموزش ترید با ترجمه فارسی، ویدیوهای آموزشی فارکس با زیرنویس و آموزش بازارهای مالی به زبان فارسی.',
        path: '/videos',
      })
    } else if (isChart) {
      setPageSeo({
        title: 'نمودار زنده بیت‌کوین | چارت مسترز',
        description: 'نمودار زنده و حرفه‌ای قیمت بیت‌کوین با ابزارهای تحلیل تکنیکال و پشتیبانی از بازه‌های زمانی مختلف.',
        path: '/chart',
      })
    } else if (isIndicators) {
      setPageSeo({
        title: 'دانلود اندیکاتور و اسکریپت تریدینگ‌ویو و متاتریدر | چارت مسترز',
        description: 'دانلود اندیکاتورها و اسکریپت‌های آماده برای تریدینگ‌ویو (Pine Script) و متاتریدر ۴ و ۵ همراه با آموزش نصب و استفاده به زبان فارسی.',
        path: '/indicators',
      })
    } else if (isAbout) {
      setPageSeo({
        title: 'درباره چارت مسترز | آموزش بازارهای مالی با زیرنویس فارسی',
        description: 'چارت مسترز دسترسی فارسی‌زبان‌ها به ویدیوهای آموزشی ترید ترجمه‌شده، آموزش فارکس با زیرنویس فارسی و محتوای تخصصی بازارهای مالی را ساده‌تر می‌کند.',
        path: '/about',
      })
    }
  }, [path, isHome, isVideos, isChart, isIndicators, isAbout])

  // Android-only: finish Google sign-in when the system browser returns through the deep link.
  useEffect(() => {
    let dispose = () => {}
    let disposed = false
    initNativeAuthListener().then((cleanup) => {
      if (disposed) cleanup()
      else dispose = cleanup
    }).catch(() => {})
    return () => { disposed = true; dispose() }
  }, [])

  // Android-only: check version on launch / resume and register for FCM.
  useEffect(() => {
    if (!isAndroidNative()) return undefined

    let cancelled = false

    async function runCheck() {
      try {
        const result = await checkForAppUpdate()
        if (!cancelled) setAppUpdate(result)
      } catch (error) {
        console.warn('[appUpdate] check failed', error)
      }
    }

    runCheck()
    initAndroidPushNotifications().catch(() => {})

    let disposed = false
    let removeResume = () => {}
    onAppResume(() => {
      runCheck()
      initAndroidPushNotifications().catch(() => {})
    }).then((dispose) => {
      const cleanup = dispose || (() => {})
      if (disposed) cleanup()
      else removeResume = cleanup
    })

    return () => {
      cancelled = true
      disposed = true
      removeResume()
    }
  }, [])

  const updateOverlay = appUpdate ? (
    <AppUpdateModal
      update={appUpdate}
      onDismiss={() => setAppUpdate(null)}
    />
  ) : null

  // Mandatory update blocks the whole app on Android.
  if (appUpdate?.latest?.isMandatory) {
    return (
      <>
        {updateOverlay}
      </>
    )
  }

  if (isAdminLogin) return <><AdminLogin />{updateOverlay}</>
  if (isOAuthConsent) return <><OAuthConsent />{updateOverlay}</>
  if (isUserLogin) return <><GoogleLogin />{updateOverlay}</>
  if (isUserDashboard || userDashboardSection) {
    return (
      <div className="app-shell">
        <Header />
        <main className="main-content">
          {userDashboardSection ? <UserDashboardSection section={userDashboardSection} /> : <UserDashboard />}
        </main>
        {updateOverlay}
      </div>
    )
  }
  if (isAdmin) {
    const session = supabase.getSession()
    const isAdminUser = session?.user?.app_metadata?.role === 'admin'
    if (!isAdminUser) {
      window.location.replace('/admin/login')
      return null
    }
    return <><AdminDashboard />{updateOverlay}</>
  }

  return (
    <div className="app-shell">
      {isChart && <ThemeToggle className="theme-toggle--chart" />}
      {!isChart && <Header />}
      {isHome ? (
        <main className="main-content" id="home">
          <section className="hero-section">
            <div className="hero-glow" />
            <div className="hero-content">
              <span className="eyebrow"><span className="status-dot" /> دنیای ترید، به زبان خودت</span>
              <h1><AnimatedText text="دانش ترید را" /><br /><span className="hl"><AnimatedText text="بدون مرز زبانی" offset={3} /></span>{' '}<AnimatedText text="یاد بگیر." offset={6} /></h1>
              <p className="hero-description">
                آموزش‌های ارزشمند بازارهای مالی از بهترین منابع دنیا؛
                حالا با ترجمه فارسی، ساده‌تر و در دسترس‌تر از همیشه.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#videos">مشاهده ویدیوها <span>←</span></a>
                <a className="secondary-button" href="/about">درباره چارت مسترز</a>
              </div>
              <div className="hero-meta">
                <span><i /> محتوای تخصصی</span>
                <span><i /> ترجمه فارسی</span>
                <span><i /> یادگیری باکیفیت</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <MarketChart />
              <div className="floating-chip chip-top">✦ یادگیری هوشمند</div>
              <div className="floating-chip chip-bottom"><span className="status-dot" /> فارسی و روان</div>
            </div>
          </section>
          <BannerSlider />
          <VideosSection />
          <HomeIndicators />
        </main>
      ) : isVideos ? (
        <main className="main-content">
          <VideosSection archive />
        </main>
      ) : isChart ? (
        <main className="main-content chart-main">
          <Chart />
        </main>
      ) : isIndicators ? (
        <main className="main-content"><Indicators /></main>
      ) : indicatorSlug ? (
        <IndicatorPage slug={indicatorSlug} />
      ) : isAbout ? <About /> : videoId ? <VideoPage videoId={videoId} /> : <NotFound />}
      {!isChart && <Footer />}
      {updateOverlay}
    </div>
  )
}

export default App
