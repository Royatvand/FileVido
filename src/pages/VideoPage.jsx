import { useEffect, useState } from 'react'
import { getVideoById, getAparatEmbedUrl, getPlaylistForVideo, videos } from '../data/videos'
import { supabase } from '../lib/supabase'
import NotFound from './NotFound'
import './VideoPage.css'

function VideoPage({ videoId }) {
  const demoVideo = getVideoById(videoId)
  const [databaseVideo, setDatabaseVideo] = useState(null)
  const [loading, setLoading] = useState(!demoVideo)

  useEffect(() => {
    if (demoVideo) { setLoading(false); return }
    let active = true
    async function loadVideo() {
      try {
        const rows = await supabase.select('videos', `&slug=eq.${encodeURIComponent(videoId)}&status=eq.published&limit=1`)
        if (active && rows?.[0]) setDatabaseVideo(rows[0])
      } catch {
        // NotFound is shown when a published record cannot be loaded.
      } finally {
        if (active) setLoading(false)
      }
    }
    loadVideo()
    return () => { active = false }
  }, [videoId, demoVideo])

  const video = demoVideo || (databaseVideo ? {
    id: databaseVideo.slug, aparatId: databaseVideo.aparat_id,
    title: databaseVideo.title, description: databaseVideo.description,
    cover: databaseVideo.cover_url || '/covers/cover-1.svg',
    category: '', duration: databaseVideo.duration, level: databaseVideo.level,
    instructor: databaseVideo.instructor, tags: databaseVideo.tags || [],
  } : null)

  if (loading) return <main className="page-content video-page"><div className="admin-empty">در حال بارگذاری ویدیو...</div></main>
  if (!video) return <NotFound />

  const playlist = demoVideo ? getPlaylistForVideo(video.id) : null
  const playlistVideos = playlist ? playlist.videoIds.map((id) => getVideoById(id)).filter(Boolean) : []
  const currentIndex = playlistVideos.findIndex((item) => item.id === video.id)
  const previousVideo = currentIndex > 0 ? playlistVideos[currentIndex - 1] : null
  const nextVideo = currentIndex >= 0 && currentIndex < playlistVideos.length - 1 ? playlistVideos[currentIndex + 1] : null
  const related = demoVideo ? videos.filter((item) => item.id !== video.id && !playlist?.videoIds.includes(item.id)).slice(0, 3) : []

  return (
    <main className="page-content video-page">
      <a className="back-link" href="/#videos">→ بازگشت به ویدیوها</a>
      <div className={`watch-layout ${playlist ? 'has-playlist' : ''}`}>
        <div className="watch-main">
          <div className="player-frame"><iframe src={getAparatEmbedUrl(video.aparatId)} title={video.title} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
          <section className="video-info">
            <div className="video-title-row">{video.category && <span className="video-category">{video.category}</span>}{playlist && <span className="watch-playlist-label">پلی‌لیست: {playlist.title}</span>}</div>
            <h1>{video.title}</h1>
            <div className="video-meta">{video.instructor && <span>مدرس: {video.instructor}</span>}{video.level && <span>سطح: {video.level}</span>}{video.duration && <span>مدت: {video.duration}</span>}</div>
            <div className="video-description"><h2>درباره این ویدیو</h2><p>{video.description}</p></div>
            {video.tags.length > 0 && <div className="video-tags" aria-label="برچسب‌های ویدیو">{video.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          </section>
          {playlist && <nav className="lesson-navigation" aria-label="ناوبری جلسات پلی‌لیست">
            {previousVideo ? <a className="lesson-nav-card" href={`/video/${previousVideo.id}`}><span>← جلسه قبلی</span><strong>{previousVideo.playlistLabel || previousVideo.title}</strong></a> : <div className="lesson-nav-placeholder" />}
            {nextVideo ? <a className="lesson-nav-card next-lesson" href={`/video/${nextVideo.id}`}><span>جلسه بعدی →</span><strong>{nextVideo.playlistLabel || nextVideo.title}</strong></a> : <div className="lesson-nav-placeholder" />}
          </nav>}
        </div>
        {playlist && <aside className="playlist-panel">
          <div className="playlist-panel-heading"><span className="playlist-eyebrow">مسیر یادگیری</span><h2>{playlist.title}</h2><p>{playlist.description}</p><div className="playlist-progress"><span>{playlistVideos.length} جلسه</span><span>جلسه {currentIndex + 1} از {playlistVideos.length}</span></div><div className="playlist-progress-track"><span style={{ width: `${((currentIndex + 1) / playlistVideos.length) * 100}%` }} /></div></div>
          <div className="playlist-lessons">{playlistVideos.map((item, index) => {
            const isActive = item.id === video.id
            return <a key={item.id} href={`/video/${item.id}`} className={`playlist-lesson ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined}><span className="playlist-lesson-number">{isActive ? '▶' : String(index + 1).padStart(2, '0')}</span><span className="playlist-lesson-copy"><strong>{item.playlistLabel || item.title}</strong><small>{item.duration || 'ویدیوی آموزشی'}</small></span>{isActive && <span className="playlist-now">در حال پخش</span>}</a>
          })}</div>
        </aside>}
      </div>
      {related.length > 0 && <section className="related-videos"><div className="related-heading"><span className="section-kicker">ادامه یادگیری</span><h2>ویدیوهای مرتبط</h2></div><div className="related-list">{related.map((item) => <a key={item.id} className="related-item" href={`/video/${item.id}`}><img src={item.cover} alt="" loading="lazy" /><span>{item.title}</span>{item.category && <small>{item.category}</small>}</a>)}</div></section>}
    </main>
  )
}

export default VideoPage
