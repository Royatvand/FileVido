import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import NotFound from './pages/NotFound'
import VideosSection from './components/VideosSection'
import VideoPage from './pages/VideoPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import { supabase } from './lib/supabase'
import './admin.css'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isHome = path === '/'
  const isAbout = path === '/about'
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
              <h1>دانش ترید را<br /><span>بدون مرز زبانی</span> یاد بگیر.</h1>
              <p className="hero-description">
                آموزش‌های ارزشمند بازارهای مالی از بهترین منابع دنیا؛
                حالا با ترجمه فارسی، ساده‌تر و در دسترس‌تر از همیشه.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#videos">مشاهده ویدیوها <span>←</span></a>
                <a className="secondary-button" href="/about">درباره TradeFarsi</a>
              </div>
              <div className="hero-meta">
                <span><i /> محتوای تخصصی</span>
                <span><i /> ترجمه فارسی</span>
                <span><i /> یادگیری باکیفیت</span>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-card">
                <div className="visual-card-top"><span>MARKET INSIGHT</span><span className="live-pill">LIVE</span></div>
                <div className="chart-value">+۱۲.۸۴٪</div>
                <div className="chart-label">رشد نمونه بازار</div>
                <svg className="chart-line" viewBox="0 0 340 130" fill="none">
                  <path d="M2 108 C28 100 30 78 55 87 S87 112 112 75 S145 83 164 58 S198 75 220 42 S255 58 275 25 S312 42 338 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M2 108 C28 100 30 78 55 87 S87 112 112 75 S145 83 164 58 S198 75 220 42 S255 58 275 25 S312 42 338 5 V130 H2Z" fill="url(#chartFill)" opacity=".18" />
                  <defs><linearGradient id="chartFill" x1="170" y1="0" x2="170" y2="130" gradientUnits="userSpaceOnUse"><stop stopColor="#8CF2B1" /><stop offset="1" stopColor="#8CF2B1" stopOpacity="0" /></linearGradient></defs>
                </svg>
                <div className="chart-footer"><span>MARKET EDUCATION</span><span>01 — 2026</span></div>
              </div>
              <div className="floating-chip chip-top">✦ یادگیری هوشمند</div>
              <div className="floating-chip chip-bottom"><span className="status-dot" /> فارسی و روان</div>
            </div>
          </section>
          <VideosSection />
        </main>
      ) : isAbout ? <About /> : videoId ? <VideoPage videoId={videoId} /> : <NotFound />}
      <Footer />
    </div>
  )
}

export default App
