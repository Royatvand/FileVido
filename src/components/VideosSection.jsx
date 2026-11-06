import { useEffect, useMemo, useState } from 'react'
import VideoCard from './VideoCard'
import { supabase } from '../lib/supabase'
import { videos as demoVideos } from '../data/videos'

// یکسان‌سازی حروف عربی/فارسی و حذف نیم‌فاصله تا جست‌وجو دقیق‌تر کار کند
function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌‏‎]/g, '')
    .trim()
}

const LEVEL_ORDER = ['مقدماتی', 'متوسط', 'پیشرفته']

function VideosSection() {
  const [videos, setVideos] = useState(demoVideos)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')

  useEffect(() => {
    let active = true
    async function loadPublishedVideos() {
      try {
        const [rows, categoryRows] = await Promise.all([
          supabase.select('videos', '&status=eq.published&order=created_at.desc'),
          supabase.select('categories', '&order=name.asc').catch(() => []),
        ])
        if (!active || !rows) return
        const categoryNames = new Map((categoryRows || []).map((item) => [item.id, item.name]))
        setVideos(rows.map((video) => ({
          id: video.slug,
          aparatId: video.aparat_id,
          title: video.title,
          description: video.description,
          cover: video.cover_url || '/covers/cover-1.svg',
          category: categoryNames.get(video.category_id) || '',
          duration: video.duration,
          level: video.level,
          instructor: video.instructor,
          tags: video.tags || [],
        })))
      } catch {
        // Keep demo content visible until the database is configured.
      }
    }
    loadPublishedVideos()
    return () => { active = false }
  }, [])

  const categories = useMemo(
    () => [...new Set(videos.map((video) => video.category).filter(Boolean))],
    [videos],
  )
  const levels = useMemo(() => {
    const found = new Set(videos.map((video) => video.level).filter(Boolean))
    const known = LEVEL_ORDER.filter((item) => found.has(item))
    return [...known, ...[...found].filter((item) => !LEVEL_ORDER.includes(item))]
  }, [videos])

  const filteredVideos = useMemo(() => {
    const term = normalize(query)
    return videos.filter((video) => {
      if (category && video.category !== category) return false
      if (level && video.level !== level) return false
      if (!term) return true
      const haystack = normalize([video.title, video.description, video.instructor, video.category, video.level, ...(video.tags || [])].join(' '))
      return haystack.includes(term)
    })
  }, [videos, query, category, level])

  const hasFilters = Boolean(query || category || level)
  const showFilters = videos.length > 1

  function resetFilters() {
    setQuery('')
    setCategory('')
    setLevel('')
  }

  return (
    <section className="videos-section" id="videos">
      <div className="videos-heading">
        <span className="section-kicker">کتابخانه آموزشی</span>
        <h2>ویدیوهای آموزشی</h2>
        <p>آموزش‌های منتخب بازارهای مالی با ترجمه فارسی.</p>
      </div>

      {showFilters && (
        <div className="videos-filters">
          <label className="videos-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجوی عنوان، توضیحات یا برچسب..."
              aria-label="جست‌وجوی ویدیوها"
            />
          </label>

          {categories.length > 0 && (
            <div className="filter-group" role="group" aria-label="فیلتر دسته‌بندی">
              <span className="filter-label">دسته‌بندی</span>
              <div className="filter-chips">
                <button type="button" className={`filter-chip ${category === '' ? 'active' : ''}`} aria-pressed={category === ''} onClick={() => setCategory('')}>همه</button>
                {categories.map((item) => (
                  <button key={item} type="button" className={`filter-chip ${category === item ? 'active' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>
            </div>
          )}

          {levels.length > 0 && (
            <div className="filter-group" role="group" aria-label="فیلتر سطح">
              <span className="filter-label">سطح</span>
              <div className="filter-chips">
                <button type="button" className={`filter-chip ${level === '' ? 'active' : ''}`} aria-pressed={level === ''} onClick={() => setLevel('')}>همه</button>
                {levels.map((item) => (
                  <button key={item} type="button" className={`filter-chip ${level === item ? 'active' : ''}`} aria-pressed={level === item} onClick={() => setLevel(item)}>{item}</button>
                ))}
              </div>
            </div>
          )}

          <div className="filters-status" aria-live="polite">
            <span>{filteredVideos.length} ویدیو{hasFilters ? ` از ${videos.length}` : ''}</span>
            {hasFilters && <button type="button" className="filter-reset" onClick={resetFilters}>پاک کردن فیلترها</button>}
          </div>
        </div>
      )}

      {filteredVideos.length > 0 ? (
        <div className="videos-grid">
          {filteredVideos.map((video) => <VideoCard key={video.id} video={video} />)}
        </div>
      ) : (
        <div className="videos-empty">
          <strong>ویدیویی با این فیلترها پیدا نشد.</strong>
          <p>عبارت جست‌وجو را تغییر بده یا فیلترها را پاک کن.</p>
          <button type="button" className="secondary-button" onClick={resetFilters}>پاک کردن فیلترها</button>
        </div>
      )}
    </section>
  )
}

export default VideosSection
