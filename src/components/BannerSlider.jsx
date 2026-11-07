import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { demoBanners } from '../data/banners'
import './BannerSlider.css'

const AUTOPLAY_MS = 5500
const SWIPE_PX = 50

const isExternal = (url = '') => /^https?:\/\//i.test(url)

function BannerSlider() {
  const [banners, setBanners] = useState(null) // null = در حال بارگذاری
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const drag = useRef({ x: 0, y: 0, active: false, moved: false })

  useEffect(() => {
    let active = true
    async function loadBanners() {
      try {
        const rows = await supabase.select('banners', '&is_active=eq.true&order=sort_order.asc,created_at.desc')
        if (active) setBanners(rows || [])
      } catch {
        // جدول banners هنوز ساخته نشده یا Supabase در دسترس نیست: بنرهای آزمایشی نمایش داده می‌شوند.
        if (active) setBanners(demoBanners)
      }
    }
    loadBanners()
    return () => { active = false }
  }, [])

  const count = banners?.length || 0
  const go = useCallback((next) => {
    if (!count) return
    setIndex(((next % count) + count) % count)
  }, [count])

  useEffect(() => {
    if (count < 2 || paused) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setTimeout(() => go(index + 1), AUTOPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [count, index, paused, go])

  if (!banners || count === 0) return null

  // جهت صفحه RTL است: اسلاید بعدی از سمت چپ می‌آید، پس کشیدن به راست = بعدی
  function onPointerDown(event) {
    drag.current = { x: event.clientX, y: event.clientY, active: true, moved: false }
  }
  function onPointerUp(event) {
    const state = drag.current
    if (!state.active) return
    state.active = false
    const dx = event.clientX - state.x
    const dy = event.clientY - state.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      state.moved = true
      go(dx > 0 ? index + 1 : index - 1)
    }
  }
  function onClickCapture(event) {
    if (drag.current.moved) {
      event.preventDefault()
      drag.current.moved = false
    }
  }
  function onKeyDown(event) {
    if (event.key === 'ArrowLeft') go(index + 1)
    if (event.key === 'ArrowRight') go(index - 1)
  }

  return (
    <section className="banner-section" aria-roledescription="carousel" aria-label="ویدیوهای جدید">
      <div
        className="banner-slider"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current.active = false }}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
      >
        <div className="banner-track" style={{ transform: `translateX(${index * 100}%)` }}>
          {banners.map((banner, position) => {
            const external = isExternal(banner.link_url)
            const hidden = position !== index
            const content = (
              <>
                <img src={banner.image_url} alt="" loading={position === 0 ? 'eager' : 'lazy'} draggable="false" />
                <span className="banner-shade" />
                <span className="banner-copy">
                  <span className="banner-tag">ویدیوی جدید</span>
                  <strong>{banner.title}</strong>
                  {banner.subtitle && <span className="banner-subtitle">{banner.subtitle}</span>}
                  {banner.link_url && <span className="banner-cta">مشاهده <span aria-hidden="true">←</span></span>}
                </span>
              </>
            )
            return banner.link_url ? (
              <a
                key={banner.id}
                className="banner-slide"
                href={banner.link_url}
                draggable="false"
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                aria-hidden={hidden}
                tabIndex={hidden ? -1 : 0}
                aria-label={`${position + 1} از ${count}: ${banner.title}`}
              >
                {content}
              </a>
            ) : (
              <div key={banner.id} className="banner-slide" aria-hidden={hidden}>{content}</div>
            )
          })}
        </div>

        {count > 1 && (
          <>
            <button type="button" className="banner-arrow banner-prev" onClick={() => go(index - 1)} aria-label="بنر قبلی">→</button>
            <button type="button" className="banner-arrow banner-next" onClick={() => go(index + 1)} aria-label="بنر بعدی">←</button>
            <div className="banner-dots" role="tablist" aria-label="انتخاب بنر">
              {banners.map((banner, position) => (
                <button
                  key={banner.id}
                  type="button"
                  role="tab"
                  aria-selected={position === index}
                  aria-label={`بنر ${position + 1}`}
                  className={`banner-dot ${position === index ? 'active' : ''}`}
                  onClick={() => go(position)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default BannerSlider
