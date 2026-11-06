import VideoCard from './VideoCard'
import { videos } from '../data/videos'

function VideosSection() {
  return (
    <section className="videos-section" id="videos">
      <div className="videos-heading">
        <span className="section-kicker">نسخه آزمایشی</span>
        <h2>ویدیوهای آموزشی</h2>
        <p>چند ویدیوی نمونه از کتابخانه TradeFarsi؛ روی هر کارت بزن و تماشا کن.</p>
      </div>
      <div className="videos-grid">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  )
}

export default VideosSection
