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
