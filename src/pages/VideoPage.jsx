import { getVideoById, getAparatEmbedUrl, videos } from '../data/videos'
import NotFound from './NotFound'

function VideoPage({ videoId }) {
  const video = getVideoById(videoId)

  if (!video) return <NotFound />

  const related = videos.filter((item) => item.id !== video.id).slice(0, 3)

  return (
    <main className="page-content video-page">
      <a className="back-link" href="/#videos">→ بازگشت به ویدیوها</a>

      <div className="player-frame">
        <iframe
          src={getAparatEmbedUrl(video.aparatId)}
          title={video.title}
          allowFullScreen
          loading="lazy"
        />
      </div>

      <div className="video-info">
        {video.category && <span className="video-category">{video.category}</span>}
        <h1>{video.title}</h1>
        <div className="video-meta">
          {video.date && <span>{video.date}</span>}
          {video.duration && <span>مدت: {video.duration}</span>}
        </div>
        <p>{video.description}</p>
      </div>

      {related.length > 0 && (
        <section className="related-videos">
          <h2>ویدیوهای بیشتر</h2>
          <div className="related-list">
            {related.map((item) => (
              <a key={item.id} className="related-item" href={`/video/${item.id}`}>
                <img src={item.cover} alt="" loading="lazy" />
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default VideoPage
