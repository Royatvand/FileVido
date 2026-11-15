import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { INDICATOR_PLATFORMS } from '../lib/indicators'
import IndicatorCard from '../components/IndicatorCard'
import PlatformIcon from '../components/PlatformIcon'
import './Indicators.css'

function normalize(value = '') {
  return String(value).toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, '').trim()
}

function Indicators() {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    let active = true
    supabase.select('indicators', '&status=eq.published&order=created_at.desc')
      .then((rows) => { if (active) { setItems(rows || []); setState('ready') } })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const q = normalize(query)
    return items.filter((item) => (
      (!platform || item.platform === platform)
      && (!q || normalize(`${item.title} ${item.description}`).includes(q))
    ))
  }, [items, query, platform])

  const usedPlatforms = [...new Set(items.map((item) => item.platform))]

  return (
    <section className="indicators-page">
      <span className="section-kicker">دانلود رایگان</span>
      <h1>اندیکاتورها و اسکریپت‌ها</h1>
      <p className="indicators-intro">اسکریپت‌ها و اندیکاتورهای آماده برای تریدینگ‌ویو و متاتریدر؛ دانلود کن، نصب کن و با آموزش‌های سایت تمرین کن.</p>

      {state === 'ready' && items.length > 0 && (
        <div className="indicators-filters">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی اندیکاتور..." aria-label="جست‌وجوی اندیکاتور" />
          {usedPlatforms.length > 1 && (
            <div className="indicators-chips" role="group" aria-label="فیلتر پلتفرم">
              <button type="button" className={!platform ? 'active' : ''} onClick={() => setPlatform('')}>همه</button>
              {usedPlatforms.map((key) => (
                <button type="button" key={key} className={platform === key ? 'active' : ''} onClick={() => setPlatform(key)}><PlatformIcon platform={key} />{(INDICATOR_PLATFORMS[key] || INDICATOR_PLATFORMS.other).label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {state === 'loading' && <div className="indicators-grid" aria-busy="true">{[0, 1, 2].map((key) => <div className="indicator-card skeleton" key={key} />)}</div>}
      {state === 'error' && <div className="indicators-empty">بارگذاری اندیکاتورها انجام نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.</div>}
      {state === 'ready' && items.length === 0 && <div className="indicators-empty">به‌زودی اولین اسکریپت‌ها اینجا قرار می‌گیرند.</div>}
      {state === 'ready' && items.length > 0 && filtered.length === 0 && <div className="indicators-empty">موردی با این جست‌وجو پیدا نشد.</div>}
      {filtered.length > 0 && <div className="indicators-grid">{filtered.map((item) => <IndicatorCard key={item.id} item={item} />)}</div>}

      <p className="indicators-note">این اسکریپت‌ها فقط برای آموزش و تحلیل هستند و توصیهٔ مالی یا سیگنال خرید و فروش نیستند؛ مسئولیت معامله با خود شماست.</p>
    </section>
  )
}

export default Indicators
