function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <a className="brand" href="/" aria-label="TradeFarsi home">
            <span className="brand-mark">T<span>.</span></span>
            <span className="brand-name">Trade<span>Farsi</span></span>
          </a>
          <p>یادگیری بازارهای مالی، با محتوای باکیفیت و به زبان فارسی.</p>

          <div className="footer-socials" aria-label="شبکه‌های اجتماعی TradeFarsi">
            <span className="footer-social-icon telegram" role="img" aria-label="تلگرام">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.5 4.4 18.3 19.5c-.24 1.07-.87 1.33-1.77.83l-4.9-3.61-2.36 2.27c-.26.26-.48.48-.98.48l.35-4.98 9.07-8.2c.4-.35-.09-.55-.62-.2L5.87 13.2l-4.82-1.5c-1.05-.33-1.07-1.05.22-1.56L20.1 2.9c.87-.32 1.63.21 1.4 1.5Z" />
              </svg>
            </span>
            <span className="footer-social-icon instagram" role="img" aria-label="اینستاگرام">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle className="instagram-dot" cx="17.5" cy="6.8" r="1" />
              </svg>
            </span>
            <span className="footer-social-icon github" role="img" aria-label="گیت‌هاب">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.51-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.7 2.61 1.21 3.24.92.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.61 5.23-5.1 5.51.4.35.76 1.03.76 2.08v3.06c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
              </svg>
            </span>
          </div>
        </div>

        <div className="footer-links">
          <span className="footer-heading">دسترسی سریع</span>
          <a href="/">صفحه اصلی</a>
          <a href="/#videos">ویدیوهای آموزشی</a>
          <a href="/#categories">دسته‌بندی‌ها</a>
          <a href="/about">درباره ما</a>
        </div>

        <div className="footer-note">
          <span className="status-dot" />
          <span>در مسیر یادگیری، همراهت هستیم.</span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} TradeFarsi — تمامی حقوق محفوظ است.</span>
        <span className="footer-caption">Learn smarter. Trade better.</span>
      </div>
    </footer>
  )
}

export default Footer
