import { FaHome, FaVideo, FaLayerGroup, FaInfoCircle } from 'react-icons/fa'
import { socialLinks } from '../config/social'

const icons = {
  telegram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.5 4.4 18.3 19.5c-.24 1.07-.87 1.33-1.77.83l-4.9-3.61-2.36 2.27c-.26.26-.48.48-.98.48l.35-4.98 9.07-8.2c.4-.35-.09-.55-.62-.2L5.87 13.2l-4.82-1.5c-1.05-.33-1.07-1.05.22-1.56L20.1 2.9c.87-.32 1.63.21 1.4 1.5Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle className="instagram-dot" cx="17.5" cy="6.8" r="1" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.51-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.7 2.61 1.21 3.24.92.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.61 5.23-5.1 5.51.4.35.76 1.03.76 2.08v3.06c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  ),
}

const socials = [
  { key: 'telegram', label: 'تلگرام' },
  { key: 'instagram', label: 'اینستاگرام' },
  { key: 'github', label: 'گیت‌هاب' },
]

function Footer() {
  const telegramUrl = socialLinks.telegram

  return (
    <footer className="site-footer">
      <a
        className="telegram-cta"
        href={telegramUrl || '#'}
        {...(telegramUrl ? { target: '_blank', rel: 'noopener noreferrer' } : { onClick: (event) => event.preventDefault() })}
      >
        <span className="telegram-cta-copy">
          <strong>به جمع تریدرهای چارت مسترز بپیوند</strong>
          <span>جدیدترین ویدیوها، نکته‌ها و آموزش‌ها را زودتر از همه در تلگرام ببین.</span>
          <span className="telegram-cta-button">عضویت در کانال تلگرام <span aria-hidden="true">←</span></span>
        </span>
        <span className="telegram-cta-art" aria-hidden="true">
          <i className="telegram-ring ring-one" />
          <i className="telegram-ring ring-two" />
          <span className="telegram-badge">{icons.telegram}</span>
        </span>
      </a>

      <div className="footer-top">
        <div className="footer-brand">
          <a className="brand" href="/" aria-label="چارت مسترز - ChartMasters home">
            <span className="brand-mark" aria-hidden="true">C<span>.</span></span>
            <span className="brand-name">Chart<span>Masters</span></span>
          </a>
          <p>چارت مسترز بستری برای یادگیری بازارهای مالی است که با ارائه ویدیوهای آموزشی باکیفیت و محتوای فارسی، مسیر یادگیری تحلیل و معامله‌گری را برای علاقه‌مندان ساده‌تر می‌کند.</p>

          <div className="footer-socials" aria-label="شبکه‌های اجتماعی چارت مسترز">
            {socials.map(({ key, label }) => {
              const url = socialLinks[key]
              const className = `footer-social-icon ${key}`
              return url ? (
                <a key={key} className={className} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>{icons[key]}</a>
              ) : (
                <span key={key} className={className} role="img" aria-label={label}>{icons[key]}</span>
              )
            })}
          </div>
        </div>

        <div className="footer-links">
          <span className="footer-heading">دسترسی سریع</span>
          <a href="/"><FaHome aria-hidden="true" />صفحه اصلی</a>
          <a href="/videos"><FaVideo aria-hidden="true" />ویدیوهای آموزشی</a>
          <a href="/#categories"><FaLayerGroup aria-hidden="true" />دسته‌بندی‌ها</a>
          <a href="/about"><FaInfoCircle aria-hidden="true" />درباره ما</a>
        </div>

        <div className="footer-note">
          <span className="status-dot" />
          <span>در مسیر یادگیری، همراهت هستیم.</span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} چارت مسترز — تمامی حقوق محفوظ است.</span>
        <span className="footer-caption">Learn smarter. Trade better.</span>
      </div>
    </footer>
  )
}

export default Footer
