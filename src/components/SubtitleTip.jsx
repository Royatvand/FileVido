import { useEffect, useState } from 'react'
import { RiCheckLine, RiCloseLine, RiClosedCaptionFill, RiPaletteFill, RiSettings3Fill } from 'react-icons/ri'
import './SubtitleTip.css'

const STORAGE_KEY = 'cm_subtitle_tip_v1'
const SHOW_DELAY_MS = 1200

function wasDismissed() {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

// پنجره شناور راهنمای زیرنویس هنگام ورود به ویدیوهای یک پلی‌لیست
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
    <aside className="subtitle-tip" role="status" aria-live="polite" dir="rtl">
      <div className="subtitle-tip-header">
        <span className="subtitle-tip-icon" aria-hidden="true">
          <RiClosedCaptionFill />
        </span>
        <div className="subtitle-tip-heading">
          <span>راهنمای تماشا</span>
          <strong>زیرنویس فارسی</strong>
        </div>
        <button type="button" className="subtitle-tip-close" onClick={() => dismiss(false)} aria-label="بستن راهنما">
          <RiCloseLine />
        </button>
      </div>

      <div className="subtitle-tip-content">
        <div className="subtitle-tip-row">
          <span className="subtitle-tip-row-icon subtitle-tip-settings" aria-hidden="true"><RiSettings3Fill /></span>
          <p><strong>فعال‌کردن زیرنویس</strong><span>از تنظیمات پلیر، زیرنویس را روشن کنید.</span></p>
        </div>
        <div className="subtitle-tip-row">
          <span className="subtitle-tip-row-icon subtitle-tip-palette" aria-hidden="true"><RiPaletteFill /></span>
          <p><strong>اگر زیرنویس دیده نمی‌شود</strong><span>رنگ زیرنویس را از همان تنظیمات تغییر دهید.</span></p>
        </div>
      </div>

      <button type="button" className="subtitle-tip-ok" onClick={() => dismiss(true)}>
        <RiCheckLine aria-hidden="true" />
        متوجه شدم
      </button>
    </aside>
  )
}

export default SubtitleTip
