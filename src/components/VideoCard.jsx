function VideoCard({ video }) {
  return (
    <a className="video-card" href={`/video/${video.id}`} aria-label={`مشاهده ویدیو: ${video.title}`}>
      <div className="video-thumb">
        <img src={video.cover} alt="" loading="lazy" />
        <span className="video-play" aria-hidden="true">▶</span>
        {video.duration && <span className="video-duration">{video.duration}</span>}
      </div>
      <div className="video-body">
        {video.category && <span className="video-category">{video.category}</span>}
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <span className="video-link">تماشای ویدیو <span aria-hidden="true">←</span></span>
      </div>
    </a>
  )
}

export default VideoCard
