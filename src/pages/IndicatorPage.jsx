import { useEffect, useState } from 'react'
import NotFound from './NotFound'
import { supabase } from '../lib/supabase'
import { setPageSeo } from '../lib/seo'
import { INDICATOR_PLATFORMS, formatFileSize, indicatorDownloadUrl } from '../lib/indicators'
import SimilarIndicators from '../components/SimilarIndicators'
import './Indicators.css'

function IndicatorPage({ slug }) {
  const [indicator, setIndicator] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing | error

  useEffect(() => {
    let active = true
    supabase.select('indicators', `&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`)
      .then((rows) => {
        if (!active) return
        if (rows?.[0]) { setIndicator(rows[0]); setState('ready') } else setState('missing')
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
          <span className="indicator-platform inline">{platform.label}</span>
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

      {indicator.content && (
        <section className="indicator-section">
          <h2>توضیحات و نحوهٔ استفاده</h2>
          <div className="indicator-content">{indicator.content}</div>
        </section>
      )}

      <section className="indicator-section">
        <h2>نصب روی {platform.label}</h2>
        <p>{platform.help}</p>
      </section>

      <p className="indicators-note">این اسکریپت فقط برای آموزش و تحلیل است و توصیهٔ مالی یا سیگنال خرید و فروش نیست؛ پیش از استفاده روی حساب واقعی، آن را روی دمو بسنج.</p>

      <SimilarIndicators current={indicator} />
    </article>
    </main>
  )
}

export default IndicatorPage
