function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-orbit orbit-a" />
      <div className="not-found-orbit orbit-b" />
      <div className="not-found-content">
        <span className="not-found-code">404</span>
        <span className="section-kicker">صفحه پیدا نشد</span>
        <h1>انگار از مسیر خارج شدی!</h1>
        <p>صفحه‌ای که دنبالش هستی وجود نداره یا آدرسش تغییر کرده.</p>
        <a className="primary-button" href="/">بازگشت به صفحه اصلی <span>←</span></a>
      </div>
    </main>
  )
}

export default NotFound
