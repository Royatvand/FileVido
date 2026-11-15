import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pickSimilarIndicators } from '../lib/indicators'
import IndicatorCard from './IndicatorCard'

const AUTOPLAY_MS = 4500
const CARD_COLUMNS = 'id,title,slug,description,platform,version,cover_url,file_size,download_count,created_at'

// «اندیکاتورهای مشابه» به‌شکل اسلایدر؛ بالای فوتر صفحهٔ هر اندیکاتور
function SimilarIndicators({ current }) {
  const [items, setItems] = useState([])
  const trackRef = useRef(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    let active = true
    supabase.select('indicators', '&status=eq.published&order=created_at.desc&limit=40', CARD_COLUMNS)
      .then((rows) => { if (active) setItems(pickSimilarIndicators(current, rows || [])) })
      .catch(() => { if (active) setItems([]) }) // بخش «مشابه» اختیاری است؛ خطا صفحه را خراب نمی‌کند
    return () => { active = false }
  }, [current])

  const scrollByCard = useCallback((direction) => {
    const track = trackRef.current
    const card = track?.firstElementChild
    if (!card) return
    const rtl = getComputedStyle(track).direction === 'rtl'
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0)
    const atEnd = Math.abs(track.scrollLeft) + track.clientWidth >= track.scrollWidth - 4
    const atStart = Math.abs(track.scrollLeft) <= 4
    if (direction > 0 && atEnd) { track.scrollTo({ left: 0, behavior: 'smooth' }); return }
    if (direction < 0 && atStart) { track.scrollTo({ left: rtl ? -track.scrollWidth : track.scrollWidth, behavior: 'smooth' }); return }
    track.scrollBy({ left: (rtl ? -1 : 1) * direction * step, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (items.length < 2) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => {
      if (!pausedRef.current && !document.hidden) scrollByCard(1)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [items.length, scrollByCard])

  if (items.length === 0) return null

  const pause = () => { pausedRef.current = true }
  const resume = () => { pausedRef.current = false }

  return (
    <section className="similar-indicators" aria-label="اندیکاتورهای مشابه">
      <span className="section-kicker">پیشنهاد برای تو</span>
      <h2>اندیکاتورهای مشابه</h2>
      <div className="course-slider indicator-slider" onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume} onTouchStart={pause} onTouchEnd={resume}>
        {items.length > 1 && (
          <>
            <button type="button" className="slider-arrow slider-prev" onClick={() => scrollByCard(-1)} aria-label="اندیکاتور قبلی">→</button>
            <button type="button" className="slider-arrow slider-next" onClick={() => scrollByCard(1)} aria-label="اندیکاتور بعدی">←</button>
          </>
        )}
        <div className="indicator-slider-track" ref={trackRef}>
          {items.map((item) => <IndicatorCard key={item.id} item={item} />)}
        </div>
      </div>
    </section>
  )
}

export default SimilarIndicators
