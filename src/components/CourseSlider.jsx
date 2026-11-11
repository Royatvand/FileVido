import { useCallback, useEffect, useRef } from 'react'
import PlaylistCard from './PlaylistCard'

const AUTOPLAY_MS = 4500

// اسلایدر افقی دوره‌ها: با کشیدن/فلش جابه‌جا می‌شود و هر چند ثانیه خودکار جلو می‌رود
function CourseSlider({ playlists }) {
  const trackRef = useRef(null)
  const pausedRef = useRef(false)

  const scrollByCard = useCallback((direction) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild
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
    if (playlists.length < 2) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => {
      if (!pausedRef.current && !document.hidden) scrollByCard(1)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [playlists.length, scrollByCard])

  const pause = () => { pausedRef.current = true }
  const resume = () => { pausedRef.current = false }

  return (
    <div className="course-slider" onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume} onTouchStart={pause} onTouchEnd={resume}>
      {playlists.length > 1 && (
        <>
          <button type="button" className="slider-arrow slider-prev" onClick={() => scrollByCard(-1)} aria-label="دوره قبلی">→</button>
          <button type="button" className="slider-arrow slider-next" onClick={() => scrollByCard(1)} aria-label="دوره بعدی">←</button>
        </>
      )}
      <div className="course-slider-track" ref={trackRef}>
        {playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}
      </div>
    </div>
  )
}

export default CourseSlider
