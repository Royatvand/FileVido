import { useState } from 'react'
import { SITE_FONTS, applySiteFont, readStoredFont } from '../lib/siteFont'
import { userAuth } from '../lib/supabase'

function FontPicker({ onSaved, onError, onNotice }) {
  const [current, setCurrent] = useState(readStoredFont)
  const [saving, setSaving] = useState('')

  async function choose(id) {
    if (id === current || saving) return
    const previous = current
    applySiteFont(id)
    setCurrent(id)
    setSaving(id)
    onError?.('')
    onNotice?.('')
    try {
      const updatedUser = await userAuth.updateProfile({ ui_font: id })
      onSaved?.(updatedUser)
      onNotice?.('فونت سایت ذخیره شد و روی همه صفحه‌ها اعمال می‌شود.')
    } catch (err) {
      applySiteFont(previous)
      setCurrent(previous)
      onError?.(err.message || 'ذخیره فونت انجام نشد.')
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="user-font-picker">
      <div className="user-dashboard-panel-heading"><div><h3>فونت سایت</h3></div></div>
      <p className="user-font-picker-note">یک فونت را انتخاب کن. همین حساب، روی همین دستگاه و دستگاه‌های بعدی که با آن وارد شوی، با این فونت سایت را می‌بیند.</p>
      <div className="user-font-grid" role="radiogroup" aria-label="انتخاب فونت سایت">
        {SITE_FONTS.map((font) => {
          const active = current === font.id
          return (
            <button
              key={font.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={'user-font-card' + (active ? ' is-active' : '')}
              style={{ fontFamily: font.family }}
              onClick={() => choose(font.id)}
              disabled={Boolean(saving)}
            >
              <strong>{font.label}</strong>
              <span>{font.sample}</span>
              <small>{saving === font.id ? 'در حال ذخیره...' : font.description}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default FontPicker
