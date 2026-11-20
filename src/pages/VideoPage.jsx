import { useEffect, useState } from 'react'
import { FaTelegramPlane } from 'react-icons/fa'
import { getVideoById, getAparatEmbedUrl, getPlaylistForVideo, videos } from '../data/videos'
import { supabase, userAuth, userLearning } from '../lib/supabase'
import NotFound from './NotFound'
import { setPageSeo } from '../lib/seo'
import { stripIconTokens } from '../lib/iconTokens'
import RichText from '../components/RichText'
import SubtitleTip from '../components/SubtitleTip'
import { formatFileSize } from '../lib/indicators'
import './VideoPage.css'

function VideoPage({ videoId }) {
  const demoVideo = getVideoById(videoId)
  const [databaseVideo, setDatabaseVideo] = useState(null)
  const [databasePlaylists, setDatabasePlaylists] = useState([])
  const [loading, setLoading] = useState(!demoVideo)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let active = true
    async function loadVideo() {
      try {
        const rows = await supabase.select('videos', '&slug=eq.' + encodeURIComponent(videoId) + '&status=eq.published&limit=1')
        const row = rows && rows[0]
        if (!row || !active) return
        setDatabaseVideo(row)

        const memberships = await supabase.select(
          'playlist_videos',
          '&video_id=eq.' + row.id + '&order=position.asc',
          'playlist_id,position,playlists(id,title,description,status)',
        )
        const publishedMemberships = (memberships || []).filter((item) => item.playlists && item.playlists.status === 'published')
        const details = await Promise.all(publishedMemberships.map(async (membership) => {
          const entries = await supabase.select(
            'playlist_videos',
            '&playlist_id=eq.' + membership.playlist_id + '&order=position.asc',
            'position,videos(id,slug,title,duration,status)',
          )
          const lessons = (entries || [])
            .filter((item) => item.videos && item.videos.status === 'published')
            .map((item) => ({ ...item.videos, id: item.videos.slug }))
          // فایل‌های PDF اختیاری‌اند؛ اگر جدول وجود نداشت یا خطا داد، فقط نمایش داده نمی‌شوند
          const files = await supabase.select('playlist_files', '&playlist_id=eq.' + membership.playlist_id + '&order=position.asc,created_at.asc').catch(() => [])
          const filesWithUrls = await Promise.all((files || []).map(async (file) => ({
            ...file,
            downloadUrl: await supabase.createPlaylistFileSignedUrl(file.file_path, file.file_name).catch(() => ''),
          })))
          return { ...membership.playlists, videos: lessons, files: filesWithUrls.filter((file) => file.downloadUrl) }
        }))
        if (active) setDatabasePlaylists(details)
      } catch {
        // NotFound is shown if the published video cannot be loaded.
      } finally {
        if (active) setLoading(false)
      }
    }
    loadVideo()
    return () => { active = false }
  }, [videoId, demoVideo])

  const video = demoVideo || (databaseVideo ? {
    id: databaseVideo.slug,
    aparatId: databaseVideo.aparat_id,
    title: databaseVideo.title,
    description: databaseVideo.description,
    cover: databaseVideo.cover_url || '/covers/cover-1.svg',
    category: '',
    duration: databaseVideo.duration,
    level: databaseVideo.level,
    instructor: databaseVideo.instructor,
    tags: databaseVideo.tags || [],
  } : null)

  useEffect(() => {
    if (!databaseVideo?.id) return
    let active = true
    async function trackUserLearning() {
      try {
        const session = await userAuth.getValidSession()
        if (!session?.user) return
        await userLearning.addHistory(databaseVideo.id)
        const status = await userLearning.getVideoStatus(databaseVideo.id)
        if (active) {
          setIsFavorite(status.isFavorite)
          setIsCompleted(Boolean(status.progress?.is_completed))
        }
      } catch {
        // نمایش ویدیو نباید به‌خاطر خطای ثبت سابقه متوقف شود.
      }
    }
    trackUserLearning()
    return () => { active = false }
  }, [databaseVideo?.id])

  async function handleFavorite() {
    const session = await userAuth.getValidSession()
    if (!session?.user) {
      window.location.assign('/login?next=' + encodeURIComponent(window.location.pathname))
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      const nextValue = !isFavorite
      await userLearning.setFavorite(databaseVideo.id, nextValue)
      setIsFavorite(nextValue)
    } catch (error) {
      setActionError(error.message || 'ذخیره علاقه‌مندی انجام نشد.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCompletion() {
    const session = await userAuth.getValidSession()
    if (!session?.user) {
      window.location.assign('/login?next=' + encodeURIComponent(window.location.pathname))
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      const nextValue = !isCompleted
      await userLearning.setCompleted(databaseVideo.id, nextValue)
      setIsCompleted(nextValue)
    } catch (error) {
      setActionError(error.message || 'ثبت پیشرفت انجام نشد.')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    if (!video) return
    const description = stripIconTokens(video.description || 'ویدیوی آموزشی بازارهای مالی با ترجمه فارسی در چارت مسترز.')
      .replace(/\\s+/g, ' ')
      .slice(0, 160)
    setPageSeo({
      title: `${video.title} | چارت مسترز`,
      description,
      path: `/video/${encodeURIComponent(video.id)}`,
      image: video.cover,
    })
  }, [video?.id, video?.title, video?.description, video?.cover])

  if (loading) return <main className="page-content video-page"><div className="admin-empty">در حال بارگذاری ویدیو...</div></main>
  if (!video) return <NotFound />

  const demoPlaylist = demoVideo ? getPlaylistForVideo(video.id) : null
  const playlist = demoPlaylist || databasePlaylists[0] || null
  const playlistVideos = demoPlaylist
    ? demoPlaylist.videoIds.map((id) => getVideoById(id)).filter(Boolean)
    : (playlist && playlist.videos) || []
  const currentIndex = playlistVideos.findIndex((item) => item.id === video.id)
  const previousVideo = currentIndex > 0 ? playlistVideos[currentIndex - 1] : null
  const nextVideo = currentIndex >= 0 && currentIndex < playlistVideos.length - 1 ? playlistVideos[currentIndex + 1] : null
  const related = demoVideo ? videos.filter((item) => item.id !== video.id && !demoPlaylist?.videoIds.includes(item.id)).slice(0, 3) : []
  const videoShareUrl = new URL('/video/' + encodeURIComponent(video.id), window.location.origin).toString()
  const playlistShareUrl = playlistVideos[0]?.id
    ? new URL('/video/' + encodeURIComponent(playlistVideos[0].id), window.location.origin).toString()
    : videoShareUrl
  const telegramShare = (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`

  return (
    <main className="page-content video-page">
      <a className="back-link" href="/#videos">→ بازگشت به ویدیوها</a>
      <div className={'watch-layout ' + (playlist ? 'has-playlist' : '')}>
        <div className="watch-main">
          {playlist && <SubtitleTip />}
          <div className="player-frame"><iframe src={getAparatEmbedUrl(video.aparatId)} title={video.title} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
          <div className="video-share-bar" aria-label="اشتراک‌گذاری محتوا">
            <div className="video-share-copy"><span className="video-share-kicker">با دوستانت به اشتراک بگذار</span><strong>یادگیری وقتی بهتره که باهم باشه.</strong></div>
            <div className="video-share-buttons">
              <a className="video-share-button video-share-button-primary" href={telegramShare(videoShareUrl, `🎬 ${video.title}\n\nاین ویدیو رو در چارت مسترز ببین:`)} target="_blank" rel="noopener noreferrer" aria-label="اشتراک‌گذاری ویدیو در تلگرام">
                <FaTelegramPlane aria-hidden="true" /><span>اشتراک ویدیو</span>
              </a>
              {playlist && <a className="video-share-button video-share-button-secondary" href={telegramShare(playlistShareUrl, `📚 ${playlist.title}\n\nاین پلی‌لیست آموزشی رو در چارت مسترز دنبال کن:`)} target="_blank" rel="noopener noreferrer" aria-label="اشتراک‌گذاری پلی‌لیست در تلگرام">
                <FaTelegramPlane aria-hidden="true" /><span>اشتراک پلی‌لیست</span>
              </a>}
            </div>
          </div>
          <section className="video-info">
            <div className="video-title-row">
              {video.category && <span className="video-category">{video.category}</span>}
              {demoPlaylist && <span className="watch-playlist-label">پلی‌لیست: {demoPlaylist.title}</span>}
              {!demoVideo && databasePlaylists.map((item) => <span className="watch-playlist-label" key={item.id}>پلی‌لیست: {item.title}</span>)}
            </div>
            <h1>{video.title}</h1>
            <div className="video-meta">{video.instructor && <span>مدرس: {video.instructor}</span>}{video.level && <span>سطح: {video.level}</span>}{video.duration && <span>مدت: {video.duration}</span>}</div>
            {databaseVideo && (
              <div className="video-user-actions">
                <button type="button" className={'video-user-action ' + (isFavorite ? 'is-active' : '')} onClick={handleFavorite} disabled={actionLoading}>
                  {isFavorite ? '♥ ذخیره‌شده در علاقه‌مندی‌ها' : '♡ افزودن به علاقه‌مندی‌ها'}
                </button>
                <button type="button" className={'video-user-action ' + (isCompleted ? 'is-active' : '')} onClick={handleCompletion} disabled={actionLoading}>
                  {isCompleted ? '✓ آموزش تکمیل شد' : '○ علامت‌گذاری به‌عنوان تکمیل‌شده'}
                </button>
                {actionError && <span className="video-user-action-error" role="alert">{actionError}</span>}
              </div>
            )}
            <div className="video-description"><h2>درباره این ویدیو</h2><p><RichText text={video.description} /></p></div>
            {video.tags.length > 0 && <div className="video-tags" aria-label="برچسب‌های ویدیو">{video.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          </section>
          {playlist && <nav className="lesson-navigation" aria-label="ناوبری جلسات پلی‌لیست">
            {previousVideo ? <a className="lesson-nav-card" href={'/video/' + previousVideo.id}><span>← جلسه قبلی</span><strong>{previousVideo.playlistLabel || previousVideo.title}</strong></a> : <div className="lesson-nav-placeholder" />}
            {nextVideo ? <a className="lesson-nav-card next-lesson" href={'/video/' + nextVideo.id}><span>جلسه بعدی →</span><strong>{nextVideo.playlistLabel || nextVideo.title}</strong></a> : <div className="lesson-nav-placeholder" />}
          </nav>}
        </div>
        {playlist && <aside className="playlist-panel">
          <div className="playlist-panel-heading">
            <span className="playlist-eyebrow">مسیر یادگیری</span><h2>{playlist.title}</h2><p>{playlist.description}</p>
            <div className="playlist-progress"><span>{playlistVideos.length} جلسه</span><span>جلسه {currentIndex + 1} از {playlistVideos.length}</span></div>
            <div className="playlist-progress-track"><span style={{ width: (((currentIndex + 1) / playlistVideos.length) * 100) + '%' }} /></div>
          </div>
          <div className="playlist-lessons">{playlistVideos.map((item, index) => {
            const isActive = item.id === video.id
            return <a key={item.id} href={'/video/' + item.id} className={'playlist-lesson ' + (isActive ? 'active' : '')} aria-current={isActive ? 'page' : undefined}><span className="playlist-lesson-number">{isActive ? '▶' : String(index + 1).padStart(2, '0')}</span><span className="playlist-lesson-copy"><strong>{item.playlistLabel || item.title}</strong><small>{item.duration || 'ویدیوی آموزشی'}</small></span>{isActive && <span className="playlist-now">در حال پخش</span>}</a>
          })}</div>
          {playlist.files?.length > 0 && (
            <div className="playlist-files">
              <h3>جزوه‌ها و فایل‌های دوره</h3>
              {playlist.files.map((file) => (
                <a key={file.id} className="playlist-file" href={file.downloadUrl} download={file.file_name || true}>
                  <span className="playlist-file-icon" aria-hidden="true">PDF</span>
                  <span className="playlist-file-copy"><strong>{file.title}</strong>{file.file_size > 0 && <small>{formatFileSize(file.file_size)}</small>}</span>
                  <span aria-hidden="true">↓</span>
                </a>
              ))}
            </div>
          )}
        </aside>}
      </div>
      {related.length > 0 && <section className="related-videos"><div className="related-heading"><span className="section-kicker">ادامه یادگیری</span><h2>ویدیوهای مرتبط</h2></div><div className="related-list">{related.map((item) => <a key={item.id} className="related-item" href={'/video/' + item.id}><img src={item.cover} alt="" loading="lazy" /><span>{item.title}</span>{item.category && <small>{item.category}</small>}</a>)}</div></section>}
    </main>
  )
}

export default VideoPage
