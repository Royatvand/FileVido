function parseDuration(value) {
  if (!value || typeof value !== 'string') return null

  const parts = value.trim().split(':').map(Number)
  if (parts.length !== 2 && parts.length !== 3) return null
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    if (seconds > 59) return null
    return minutes * 60 + seconds
  }

  const [hours, minutes, seconds] = parts
  if (minutes > 59 || seconds > 59) return null
  return hours * 3600 + minutes * 60 + seconds
}

function formatTotalDuration(videos) {
  // فقط وقتی مدت تمام جلسات مشخص است، مجموع کامل دوره را نمایش می‌دهیم.
  const durations = videos.map((video) => parseDuration(video.duration))
  if (durations.length === 0 || durations.some((duration) => duration === null)) {
    return 'مدت‌زمان ثبت نشده'
  }

  const totalMinutes = Math.ceil(durations.reduce((total, duration) => total + duration, 0) / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const number = (value) => value.toLocaleString('fa-IR')

  if (hours && minutes) return `${number(hours)} ساعت و ${number(minutes)} دقیقه`
  if (hours) return `${number(hours)} ساعت`
  return `${number(minutes)} دقیقه`
}

function PlaylistCard({ playlist }) {
  const lessons = playlist.videos.length
  const totalDuration = formatTotalDuration(playlist.videos)

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
        <div className="playlist-total-duration">
          <span className="playlist-duration-icon" aria-hidden="true">◷</span>
          <span className="playlist-duration-copy">
            <span className="playlist-duration-label">مدت‌زمان کل دوره</span>
            <strong>{totalDuration}</strong>
          </span>
        </div>
        <span className="video-link liquid-glass-action">شروع دوره <span className="liquid-glass-action-arrow" aria-hidden="true">←</span></span>
      </div>
    </a>
  )
}

export default PlaylistCard
