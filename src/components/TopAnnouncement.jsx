import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const isExternal = (url = '') => /^https?:\/\//i.test(url)

function TopAnnouncement() {
  const [announcement, setAnnouncement] = useState(null)

  useEffect(() => {
    let active = true
    async function loadAnnouncement() {
      try {
        const rows = await supabase.select('site_announcement', '&id=eq.true&is_active=eq.true')
        if (active) setAnnouncement(rows?.[0] || null)
      } catch {
        if (active) setAnnouncement(null)
      }
    }
    loadAnnouncement()
    return () => { active = false }
  }, [])

  if (!announcement?.message) return null

  const content = (
    <>
      {announcement.image_url && <img src={announcement.image_url} alt="" />}
      <span className="top-announcement-text">{announcement.message}</span>
      {announcement.link_url && <span className="top-announcement-arrow" aria-hidden="true">←</span>}
    </>
  )

  return (
    <aside className="top-announcement" aria-label="اطلاعیه و پیشنهاد ویژه">
      {announcement.link_url ? (
        <a className="top-announcement-link" href={announcement.link_url} {...(isExternal(announcement.link_url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {content}
        </a>
      ) : <div className="top-announcement-link">{content}</div>}
    </aside>
  )
}

export default TopAnnouncement
