import { useEffect, useState } from 'react'
import NotFound from './NotFound'
import { supabase } from '../lib/supabase'
import { setPageSeo } from '../lib/seo'
import { INDICATOR_PLATFORMS, formatFileSize, indicatorDownloadUrl } from '../lib/indicators'
import PlatformIcon from '../components/PlatformIcon'
import './Indicators.css'

function IndicatorPage({ slug }) {
  const [indicator, setIndicator] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing | error
  const [relatedItems, setRelatedItems] = useState([])

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
    let active = true
    supabase.select('indicators', '&status=eq.published&order=created_at.desc&limit=50')
      .then((rows) => {
        if (!active) return
        const published = (rows || []).filter((item) => item.id !== indicator.id)
        const samePlatform = published.filter((item) => item.platform === indicator.platform)
        const recommendations = [...samePlatform, ...published.filter((item) => item.platform !== indicator.platform)].slice(0, 3)
        setRelatedItems(recommendations)
      })
      .catch(() => { if (active) setRelatedItems([]) })
    return () => { active = false }
  }, [indicator])

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

  if (state === 'missing') return <NotFound />
  if (state === 'loading') return <section className="indicators-page"><div className="indicators-empty" aria-busy="true">در حال بارگذاری...</div></section>
  if (state === 'error') {
    return <section className="indicators-page"><div className="indicators-empty">بارگذاری انجام نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.</div><a className="secondary-button" href="/indicators">بازگشت به اندیکاتورها</a></section>
  }

  const platform = INDICATOR_PLATFORMS[indicator.platform] || INDICATOR_PLATFORMS.other
  const downloadUrl = indicatorDownloadUrl(indicator)

  return (
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
            {indicator.download_count > 0 && <span>{indicator.download_count.toLocaleString('fa-IR')} دانلود</span>}
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
        <h2><PlatformIcon platform={indicator.platform} />نصب روی {platform.label}</h2>
        <p>{platform.help}</p>
      </section>

      <p className="indicators-note">این اسکریپت فقط برای آموزش و تحلیل است و توصیهٔ مالی یا سیگنال خرید و فروش نیست؛ پیش از استفاده روی حساب واقعی، آن را روی دمو بسنج.</p>

      {relatedItems.length > 0 && (
        <section className="related-indicators">
          <div className="related-indicators-heading">
            <span className="section-kicker">بیشتر کشف کن</span>
            <h2>اندیکاتورهای پیشنهادی</h2>
          </div>
          <div className="indicators-grid">
            {relatedItems.map((item) => {
              const itemPlatform = INDICATOR_PLATFORMS[item.platform] || INDICATOR_PLATFORMS.other
              return (
                <a className="indicator-card" href={`/indicator/${encodeURIComponent(item.slug)}`} key={item.id}>
                  <div className="indicator-thumb">
                    {item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : <span className="indicator-thumb-fallback" aria-hidden="true">ƒ(x)</span>}
                    <span className="indicator-platform"><PlatformIcon platform={item.platform} />{itemPlatform.label}</span>
                  </div>
                  <div className="indicator-body">
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                    <span className="related-indicator-link">مشاهده جزئیات ←</span>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      )}
    </article>
  )
}

export default IndicatorPage
