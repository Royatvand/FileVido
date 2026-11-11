function PlaylistCard({ playlist }) {
  const lessons = playlist.videos.length
  return (
    <a className="video-card playlist-card" href={`/video/${playlist.firstVideoId}`} aria-label={`شروع دوره: ${playlist.title}`}>
      <div className="video-thumb">
        <img src={playlist.cover} alt="" loading="lazy" />
        <span className="video-play" aria-hidden="true">▶</span>
        <span className="playlist-badge">دوره · {lessons} جلسه</span>
      </div>
      <div className="video-body">
        {playlist.category && <span className="video-category">{playlist.category}</span>}
        <h3>{playlist.title}</h3>
        {playlist.description && <p>{playlist.description}</p>}
        <span className="video-link">شروع دوره <span aria-hidden="true">←</span></span>
      </div>
    </a>
  )
}

export default PlaylistCard
