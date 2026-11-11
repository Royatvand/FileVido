import { useEffect, useMemo, useState } from 'react'
import VideoCard from './VideoCard'
import PlaylistCard from './PlaylistCard'
import AnimatedText from './animated/AnimatedText'
import Counter from './animated/Counter'
import { supabase } from '../lib/supabase'
import { videos as demoVideos, playlists as demoPlaylists } from '../data/videos'

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

function VideosSection({ archive = false }) {
  const [videos, setVideos] = useState(demoVideos)
  const [playlists, setPlaylists] = useState(() => demoPlaylists.map((item) => ({ id: item.id, title: item.title, description: item.description, cover: '', createdAt: '', videoIds: item.videoIds })))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')

  useEffect(() => {
    let active = true
    async function loadPublishedVideos() {
      try {
        const [rows, categoryRows, playlistRows, membershipRows] = await Promise.all([
          supabase.select('videos', '&status=eq.published&order=created_at.desc'),
          supabase.select('categories', '&order=name.asc').catch(() => []),
          supabase.select('playlists', '&status=eq.published&order=created_at.desc').catch(() => []),
          supabase.select('playlist_videos', '&order=position.asc').catch(() => []),
        ])
        if (!active || !rows) return
        const categoryNames = new Map((categoryRows || []).map((item) => [item.id, item.name]))
        setVideos(rows.map((video) => ({
          id: video.slug,
          createdAt: video.created_at,
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
        const slugById = new Map(rows.map((video) => [video.id, video.slug]))
        setPlaylists((playlistRows || []).map((playlist) => ({
          id: playlist.id,
          title: playlist.title,
          description: playlist.description || '',
          cover: playlist.cover_url || '',
          createdAt: playlist.created_at,
          videoIds: (membershipRows || [])
            .filter((item) => item.playlist_id === playlist.id)
            .sort((a, b) => a.position - b.position)
            .map((item) => slugById.get(item.video_id))
            .filter(Boolean),
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

  // هر دوره فقط یک کارت دارد؛ ویدیوهای بدون دوره مثل قبل کارت جدا می‌گیرند
  const { items, totalItems } = useMemo(() => {
    const byId = new Map(videos.map((video) => [video.id, video]))
    const term = normalize(query)
    const inPlaylist = new Set()
    const visibleIds = new Set(filteredVideos.map((video) => video.id))
    const playlistItems = []
    let total = 0
    playlists.forEach((playlist) => {
      const lessonVideos = playlist.videoIds.map((id) => byId.get(id)).filter(Boolean)
      if (lessonVideos.length === 0) return
      lessonVideos.forEach((video) => inPlaylist.add(video.id))
      total += 1
      const matchesVideo = lessonVideos.some((video) => visibleIds.has(video.id))
      const matchesText = !category && !level && term && normalize(`${playlist.title} ${playlist.description}`).includes(term)
      if (!matchesVideo && !matchesText) return
      playlistItems.push({
        type: 'playlist',
        key: `playlist-${playlist.id}`,
        createdAt: playlist.createdAt || '',
        playlist: {
          ...playlist,
          videos: lessonVideos,
          firstVideoId: lessonVideos[0].id,
          cover: playlist.cover || lessonVideos[0].cover,
          category: lessonVideos[0].category,
        },
      })
    })
    const singles = videos.filter((video) => !inPlaylist.has(video.id))
    total += singles.length
    const singleItems = filteredVideos
      .filter((video) => !inPlaylist.has(video.id))
      .map((video) => ({ type: 'video', key: `video-${video.id}`, createdAt: video.createdAt || '', video }))
    const merged = [...playlistItems, ...singleItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return { items: merged, totalItems: total }
  }, [videos, playlists, filteredVideos, query, category, level])

  const hasFilters = Boolean(query || category || level)
  const showFilters = videos.length > 1

  function resetFilters() {
    setQuery('')
    setCategory('')
    setLevel('')
  }

  return (
    <section className={`videos-section ${archive ? 'videos-archive' : ''}`} id="videos">
      <div className="videos-heading">
        <span className="section-kicker">{archive ? 'آرشیو ویدیوها' : 'کتابخانه آموزشی'}</span>
        {archive ? <h1><AnimatedText text="همه ویدیوهای آموزشی" /></h1> : <h2><AnimatedText text="ویدیوهای آموزشی" /></h2>}
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
            <span>
              <span className="sr-only">{items.length} آموزش{hasFilters ? ` از ${totalItems}` : ''}</span>
              <span aria-hidden="true"><Counter targetValue={items.length} /> آموزش{hasFilters ? ` از ${totalItems}` : ''}</span>
            </span>
            {hasFilters && <button type="button" className="filter-reset" onClick={resetFilters}>پاک کردن فیلترها</button>}
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="videos-grid">
          {items.map((item) => (item.type === 'playlist' ? <PlaylistCard key={item.key} playlist={item.playlist} /> : <VideoCard key={item.key} video={item.video} />))}
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
