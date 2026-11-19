import { useEffect, useState } from 'react'
import './SubtitleTip.css'

const STORAGE_KEY = 'cm_subtitle_tip_v1'
const SHOW_DELAY_MS = 1200

function wasDismissed() {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

// نوتیف راهنمای زیرنویس هنگام ورود به ویدیوهای یک پلی‌لیست؛ با «متوجه شدم» دیگر نمایش داده نمی‌شود
function SubtitleTip() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (wasDismissed()) return undefined
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!visible) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setVisible(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  function dismiss(remember) {
    setVisible(false)
    if (remember) { try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ذخیره نشد؛ فقط دوباره نمایش داده می‌شود */ } }
  }

  if (!visible) return null

  return (
    <aside className="subtitle-tip" role="status" aria-live="polite">
      <span className="subtitle-tip-icon" aria-hidden="true">CC</span>
      <div className="subtitle-tip-body">
        <strong>راهنمای زیرنویس</strong>
        <p>اگر زیرنویس برایتان فعال نیست، از <b>تنظیمات پلیر</b> (آیکون چرخ‌دنده) آن را روشن کنید.</p>
        <p>اگر فعال است ولی نمایش داده نمی‌شود، <b>رنگ زیرنویس</b> را از همان تنظیمات تغییر دهید.</p>
        <button type="button" className="subtitle-tip-ok" onClick={() => dismiss(true)}>متوجه شدم</button>
      </div>
      <button type="button" className="subtitle-tip-close" onClick={() => dismiss(false)} aria-label="بستن راهنما">×</button>
    </aside>
  )
}

export default SubtitleTip
