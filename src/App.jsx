import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import NotFound from './pages/NotFound'
import VideosSection from './components/VideosSection'
import BannerSlider from './components/BannerSlider'
import AnimatedText from './components/animated/AnimatedText'
import VideoPage from './pages/VideoPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import { supabase } from './lib/supabase'
import MarketChart from './components/MarketChart'
import NativeDiagnostics from './components/NativeDiagnostics'
import './admin.css'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isHome = path === '/'
  const isAbout = path === '/about'
  const isVideos = path === '/videos'
  const isAdminLogin = path === '/admin/login'
  const isAdmin = path === '/admin'
  const videoMatch = path.match(/^\/video\/([^/]+)$/)
  const videoId = videoMatch ? decodeURIComponent(videoMatch[1]) : null

  if (isAdminLogin) return <AdminLogin />
  if (isAdmin) {
    const session = supabase.getSession()
    const isAdminUser = session?.user?.app_metadata?.role === 'admin'
    if (!isAdminUser) {
      window.location.replace('/admin/login')
      return null
    }
    return <AdminDashboard />
  }

  return (
    <div className="app-shell">
      <Header />
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
        </main>
      ) : isVideos ? (
        <main className="main-content">
          <VideosSection archive />
        </main>
      ) : isAbout ? <About /> : videoId ? <VideoPage videoId={videoId} /> : <NotFound />}
      <Footer />
      <NativeDiagnostics />
    </div>
  )
}

export default App
