import { useEffect, useState } from 'react'
import NotFound from './NotFound'
import { supabase } from '../lib/supabase'
import { INDICATOR_PLATFORMS, formatFileSize, indicatorDownloadUrl, indicatorImageUrl } from '../lib/indicators'
import PlatformIcon from '../components/PlatformIcon'
import { setPageSeo } from '../lib/seo'
import RichText from '../components/RichText'
import SimilarIndicators from '../components/SimilarIndicators'
import './Indicators.css'

const INSTALL_GUIDES = {
  metatrader4: {
    title: 'نصب اندیکاتور روی MetaTrader 4',
    intro: 'این راهنما برای نصب فایل اندیکاتور در نسخه دسکتاپ ویندوز متاتریدر ۴ است.',
    steps: [
      {
        title: 'فایل اندیکاتور را آماده کن',
        description: 'فایل دانلودشده را از حالت ZIP خارج کن. فایل اجرایی اندیکاتور معمولاً پسوند EX4 دارد. اگر فایل MQ4 دریافت کردی، بعد از کپی‌کردن آن باید در MetaEditor کامپایلش کنی.',
      },
      {
        title: 'پوشه اطلاعات متاتریدر را باز کن',
        description: 'در متاتریدر از منوی File گزینه Open Data Folder را انتخاب کن. این روش پوشه مربوط به همان نسخه‌ای را باز می‌کند که در حال استفاده از آن هستی.',
        image: 'https://www.metatrader4.com/i/help/trading-platform/en/terminal_data_folder.png',
        imageAlt: 'منوی File و گزینه Open Data Folder در MetaTrader 4',
        imageCaption: 'از منوی File گزینه Open Data Folder را انتخاب کن.',
        source: 'https://www.metatrader4.com/en/trading-platform/help/userguide/start_comm',
      },
      {
        title: 'فایل را در پوشه Indicators قرار بده',
        description: 'در پنجره بازشده وارد MQL4 و سپس Indicators شو. فایل EX4 یا MQ4 را داخل این پوشه کپی کن؛ اگر فایل داخل پوشه ZIP بود، خود فایل استخراج‌شده را کپی کن.',
        code: 'MQL4 / Indicators',
      },
      {
        title: 'اندیکاتور را در متاتریدر بارگذاری کن',
        description: 'به متاتریدر برگرد و پنجره Navigator را با Ctrl + N باز کن. روی Custom Indicators راست‌کلیک و Refresh را انتخاب کن. سپس اندیکاتور را با دوبار کلیک یا کشیدن روی نمودار اجرا کن.',
        image: 'https://www.metatrader4.com/i/help/trading-platform/en/navigator.png',
        imageAlt: 'پنجره Navigator در MetaTrader 4',
        imageCaption: 'اندیکاتورهای سفارشی از پنجره Navigator قابل انتخاب‌اند.',
        source: 'https://www.metatrader4.com/en/trading-platform/help/overview/navigator',
      },
    ],
    note: 'اگر فایل MQ4 داری، آن را در MetaEditor باز کن و با کلید F7 کامپایل کن. برای فایل EX4 آماده، نیازی به کامپایل نیست. اگر اندیکاتور نمایش داده نشد، مسیر پوشه و پسوند فایل را دوباره بررسی کن.',
  },
  metatrader5: {
    title: 'نصب اندیکاتور روی MetaTrader 5',
    intro: 'این راهنما برای نصب فایل آمادهٔ EX5 در نسخه دسکتاپ ویندوز متاتریدر ۵ است.',
    steps: [
      {
        title: 'فایل EX5 را آماده کن',
        description: 'فایل اندیکاتور دانلودشده باید پسوند EX5 داشته باشد. اگر فایل را به‌صورت ZIP دریافت کرده‌ای، ابتدا آن را از حالت فشرده خارج کن.',
      },
      {
        title: 'پوشه اطلاعات متاتریدر را باز کن',
        description: 'در پنجره MetaTrader 5 از منوی File گزینه Open Data Folder را انتخاب کن. این گزینه پوشه مربوط به همان نصب متاتریدر را باز می‌کند.',
        image: 'https://c.mql5.com/2/74/Article_03_Indicators_iOpen_MT5_Data_Folder9.png',
        imageAlt: 'انتخاب Open Data Folder از منوی File در MetaTrader 5',
        imageCaption: 'از منوی File گزینه Open Data Folder را انتخاب کن.',
        source: 'https://www.mql5.com/en/articles/14481',
      },
      {
        title: 'فایل EX5 را در پوشه Indicators کپی کن',
        description: 'در پنجره بازشده وارد پوشه MQL5 و سپس Indicators شو. فایل EX5 را در همین پوشه قرار بده.',
        code: 'MQL5 / Indicators',
        image: 'https://c.mql5.com/6/937/ALL_INSTALL_FOLDERSm11.png',
        imageAlt: 'ساختار پوشه‌های MQL5 شامل Indicators و Experts',
        imageCaption: 'فایل اندیکاتور را در پوشه Indicators قرار بده، نه Experts.',
        source: 'https://www.mql5.com/en/blogs/post/755633',
      },
      {
        title: 'اندیکاتور را روی نمودار اجرا کن',
        description: 'به متاتریدر برگرد و پنجره Navigator را با Ctrl + N باز کن. روی Indicators راست‌کلیک کن و Refresh را بزن. سپس نام اندیکاتور را پیدا کن و آن را روی نمودار بکش یا دوبار کلیک کن.',
        code: 'Navigator → Indicators → Refresh',
        source: 'https://www.mql5.com/en/articles/14481',
      },
    ],
    note: 'فایل EX5 آمادهٔ استفاده است. اگر اندیکاتور در فهرست دیده نشد، مسیر MQL5/Indicators را بررسی کن و یک‌بار متاتریدر را دوباره اجرا کن.',
  },
  tradingview: {
    title: 'نصب اسکریپت روی TradingView',
    intro: 'اسکریپت‌های TradingView با زبان Pine Script نوشته می‌شوند. برای اضافه‌کردن کد به نمودار، از Pine Editor استفاده کن.',
    steps: [
      {
        title: 'نمودار را باز کن و Pine Editor را اجرا کن',
        description: 'وارد حساب TradingView شو، یک نمودار باز کن و Pine Editor را از نوار ابزار نمودار انتخاب کن. در بعضی چیدمان‌ها این گزینه در نوار کناری یا پنل پایین قرار دارد.',
        image: 'https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43627077702/original/oyZDZOtoHFqfpwa25vY5ny93h5yfUOrAlg.png?1781033624=',
        imageAlt: 'نمودار TradingView و محل ابزارهای کناری',
        imageCaption: 'ابتدا وارد صفحه نمودار شو و Pine Editor را باز کن.',
        source: 'https://www.tradingview.com/support/solutions/43000763320-how-to-work-with-pine-editor/',
      },
      {
        title: 'کد اسکریپت را وارد Pine Editor کن',
        description: 'اگر فایل PINE یا TXT دانلود کرده‌ای، آن را با یک ویرایشگر متن باز کن، تمام کد را کپی کن و داخل Pine Editor جای‌گذاری کن. اگر کد را مستقیماً از صفحه دریافت کرده‌ای، همان کد را کامل کپی کن.',
        image: 'https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43627077896/original/px9eTtdZSzCaVyLdgLDiZ-oX-IaQVItWIg.png?1781033699=',
        imageAlt: 'محیط Pine Editor در TradingView',
        imageCaption: 'کد Pine Script را در ویرایشگر قرار بده.',
        source: 'https://www.tradingview.com/support/solutions/43000763320-how-to-work-with-pine-editor/',
      },
      {
        title: 'اسکریپت را ذخیره و به نمودار اضافه کن',
        description: 'روی Save بزن و برای اسکریپت نام انتخاب کن. سپس Add to chart را انتخاب کن تا اندیکاتور روی نمودار اجرا شود. اگر اسکریپت خطا داشته باشد، پیام خطا در ویرایشگر نمایش داده می‌شود.',
        image: 'https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43627078098/original/z9sRkZfOIhu6NV8terpZyW5X80lnm7M6Yg.png?1781033768=',
        imageAlt: 'منوی ذخیره و مدیریت اسکریپت در Pine Editor',
        imageCaption: 'از منوی نام اسکریپت می‌توانی آن را ذخیره یا یک کپی مستقل بسازی.',
        source: 'https://www.tradingview.com/support/solutions/43000711497-how-to-create-a-new-script/',
      },
    ],
    note: 'اگر اسکریپت فقط برای مشاهده منتشر شده باشد، ممکن است کد آن قابل ویرایش نباشد. در این حالت فقط وقتی گزینه Make a copy در دسترس است، یک نسخه شخصی بساز. برای اجرای اسکریپت روی نمودار، Add to chart را بزن.',
  },
}

function InstallGuide({ platform }) {
  const guide = INSTALL_GUIDES[platform]

  if (!guide) {
    return <p>راهنمای نصب این پلتفرم در توضیحات همین صفحه ارائه می‌شود.</p>
  }

  return (
    <div className="install-guide">
      <p className="install-guide-intro">{guide.intro}</p>
      <ol className="install-guide-steps">
        {guide.steps.map((step, index) => (
          <li className="install-guide-step" key={step.title}>
            <div className="install-guide-step-heading">
              <span className="install-guide-number">{index + 1}</span>
              <h3>{step.title}</h3>
            </div>
            <p>{step.description}</p>
            {step.code && <code className="install-guide-path" dir="ltr">{step.code}</code>}
            {step.image && (
              <figure className="install-guide-figure">
                <a href={step.image} target="_blank" rel="noreferrer">
                  <img src={step.image} alt={step.imageAlt} loading="lazy" />
                </a>
                <figcaption>
                  {step.imageCaption}
                  {step.source && <> منبع تصویر: <a href={step.source} target="_blank" rel="noreferrer">راهنمای پلتفرم</a></>}
                </figcaption>
              </figure>
            )}
          </li>
        ))}
      </ol>
      <div className="install-guide-note">
        <strong>نکته:</strong> {guide.note}
      </div>
    </div>
  )
}

function IndicatorPage({ slug }) {
  const [indicator, setIndicator] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing | error
  const [galleryImages, setGalleryImages] = useState([])
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    let active = true
    supabase.select('indicators', `&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`)
      .then(async (rows) => {
        if (!active) return
        if (!rows?.[0]) { setState('missing'); return }
        const images = await supabase.select('indicator_images', `&indicator_id=eq.${encodeURIComponent(rows[0].id)}&order=position.asc,created_at.asc`)
        if (!active) return
        setGalleryImages(images || [])
        setIndicator(rows[0])
        setState('ready')
      })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!indicator) return
    const platform = (INDICATOR_PLATFORMS[indicator.platform] || INDICATOR_PLATFORMS.other).label
    setPageSeo({
      title: `دانلود ${indicator.title} برای ${platform} | چارت مسترز`,
      description: indicator.description || `دانلود و آموزش نصب ${indicator.title} برای ${platform}.`,
      path: `/indicator/${indicator.slug}`,
      image: indicator.cover_url || undefined,
    })
  }, [indicator])

  // NotFound خودش <main> دارد؛ پس بیرون از <main> این صفحه رندر می‌شود تا main تو در تو نشود
  if (state === 'missing') return <NotFound />
  if (state === 'loading') return <main className="main-content"><section className="indicators-page"><div className="indicators-empty" aria-busy="true">در حال بارگذاری...</div></section></main>
  if (state === 'error') {
    return <main className="main-content"><section className="indicators-page"><div className="indicators-empty">بارگذاری انجام نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.</div><a className="secondary-button" href="/indicators">بازگشت به اندیکاتورها</a></section></main>
  }

  const platform = INDICATOR_PLATFORMS[indicator.platform] || INDICATOR_PLATFORMS.other
  const downloadUrl = indicatorDownloadUrl(indicator)

  return (
    <main className="main-content">
    <article className="indicators-page indicator-detail">
      <a className="indicator-back" href="/indicators"><span aria-hidden="true">→</span> همهٔ اندیکاتورها</a>
      <header className="indicator-head">
        {indicator.cover_url && <img src={indicator.cover_url} alt="" />}
        <div>
          <span className="indicator-platform inline"><PlatformIcon platform={indicator.platform} />{platform.label}</span>
          <h1>{indicator.title}</h1>
          {indicator.description && <p className="indicators-intro">{indicator.description}</p>}
          <div className="indicator-meta">
            <span>نسخهٔ {indicator.version}</span>
            {indicator.file_size > 0 && <span>{formatFileSize(indicator.file_size)}</span>}
            {indicator.download_count > 0 && <span>{indicator.download_count.toLocaleString('en-US')} دانلود</span>}
          </div>
          {downloadUrl ? (
            <a className="primary-button indicator-download" href={downloadUrl} download={indicator.file_name || true} onClick={() => supabase.countIndicatorDownload(indicator.slug)}>
              دانلود فایل <span aria-hidden="true">↓</span>
            </a>
          ) : <span className="indicators-empty">فایل این مورد هنوز بارگذاری نشده است.</span>}
        </div>
      </header>

      {galleryImages.length > 0 && (
        <section className="indicator-section indicator-gallery-section">
          <h2>تصاویر نحوهٔ عملکرد</h2>
          <div className="indicator-gallery-grid">
            {galleryImages.map((image) => (
              <figure className="indicator-gallery-item" key={image.id}>
                <button type="button" onClick={() => setLightboxImage(image)} aria-label={`نمایش بزرگ تصویر ${image.caption || indicator.title}`}>
                  <img src={indicatorImageUrl(image.file_path)} alt={image.caption || `تصویر عملکرد ${indicator.title}`} loading="lazy" />
                  <span aria-hidden="true">⌕</span>
                </button>
                {image.caption && <figcaption>{image.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {indicator.content && (
        <section className="indicator-section">
          <h2>توضیحات و نحوهٔ استفاده</h2>
          <div className="indicator-content"><RichText text={indicator.content} /></div>
        </section>
      )}

      <section className="indicator-section install-guide-section">
        <h2><PlatformIcon platform={indicator.platform} />نصب روی {platform.label}</h2>
        <InstallGuide platform={indicator.platform} />
      </section>

      <p className="indicators-note">این اسکریپت فقط برای آموزش و تحلیل است و توصیهٔ مالی یا سیگنال خرید و فروش نیست؛ پیش از استفاده روی حساب واقعی، آن را روی دمو بسنج.</p>

      <SimilarIndicators current={indicator} />
      {lightboxImage && (
        <div className="indicator-lightbox" role="dialog" aria-modal="true" aria-label="نمایش تصویر اندیکاتور" onClick={() => setLightboxImage(null)}>
          <button type="button" className="indicator-lightbox-close" onClick={() => setLightboxImage(null)} aria-label="بستن تصویر">×</button>
          <img src={indicatorImageUrl(lightboxImage.file_path)} alt={lightboxImage.caption || indicator.title} onClick={(event) => event.stopPropagation()} />
          {lightboxImage.caption && <p onClick={(event) => event.stopPropagation()}>{lightboxImage.caption}</p>}
        </div>
      )}
    </article>
    </main>
  )
}

export default IndicatorPage
