import { useEffect, useState } from 'react'
import VideoCard from './VideoCard'
import { supabase } from '../lib/supabase'
import { videos as demoVideos } from '../data/videos'

function VideosSection() {
  const [videos, setVideos] = useState(demoVideos)

  useEffect(() => {
    let active = true
    async function loadPublishedVideos() {
      try {
        const rows = await supabase.select('videos', '&status=eq.published&order=created_at.desc')
        if (!active || !rows) return
        setVideos(rows.map((video) => ({
          id: video.slug,
          aparatId: video.aparat_id,
          title: video.title,
          description: video.description,
          cover: video.cover_url || '/covers/cover-1.svg',
          category: '',
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

  return (
    <section className="videos-section" id="videos">
      <div className="videos-heading">
        <span className="section-kicker">کتابخانه آموزشی</span>
        <h2>ویدیوهای آموزشی</h2>
        <p>آموزش‌های منتخب بازارهای مالی با ترجمه فارسی.</p>
      </div>
      <div className="videos-grid">
        {videos.map((video) => <VideoCard key={video.id} video={video} />)}
      </div>
    </section>
  )
}

export default VideosSection
