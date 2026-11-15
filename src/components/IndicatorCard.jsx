import { INDICATOR_PLATFORMS, formatFileSize } from '../lib/indicators'

// کارت یک اندیکاتور؛ هم در فهرست /indicators و هم در اسلایدر «مشابه» استفاده می‌شود
function IndicatorCard({ item }) {
  const platform = INDICATOR_PLATFORMS[item.platform] || INDICATOR_PLATFORMS.other
  return (
    <a className="indicator-card" href={`/indicator/${encodeURIComponent(item.slug)}`} aria-label={`مشاهده و دانلود: ${item.title}`}>
      <div className="indicator-thumb">
        {item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : <span className="indicator-thumb-fallback" aria-hidden="true">ƒ(x)</span>}
        <span className="indicator-platform">{platform.label}</span>
      </div>
      <div className="indicator-body">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="indicator-meta">
          <span>نسخهٔ {item.version}</span>
          {item.file_size > 0 && <span>{formatFileSize(item.file_size)}</span>}
          {item.download_count > 0 && <span>{item.download_count.toLocaleString('en-US')} دانلود</span>}
        </div>
      </div>
    </a>
  )
}

export default IndicatorCard
