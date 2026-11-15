import { useCallback, useEffect, useRef, useState } from 'react'
import { COLORED_ICON_SETS, ICON_API, QUICK_ICONS, iconToken, iconUrl } from '../lib/iconTokens'
import './IconTextarea.css'

// textarea + پنل آیکون رنگی با جست‌وجو (مثل پنل ایموجی تلگرام)؛ آیکون در محل مکان‌نما درج می‌شود
function IconTextarea({ label, name, value, onChange, rows = 5, placeholder }) {
  const areaRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = پیشنهادها | [] = نتیجه‌ای نیست
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const term = query.trim()
  const searching = open && term.length >= 2

  useEffect(() => {
    if (!searching) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      const url = `${ICON_API}/search?query=${encodeURIComponent(term)}&prefixes=${COLORED_ICON_SETS.join(',')}&limit=64`
      fetch(url, { signal: controller.signal })
        .then((response) => { if (!response.ok) throw new Error('search'); return response.json() })
        .then((data) => { setResults((data.icons || []).map((id) => id.split(':'))); setFailed(false); setLoading(false) })
        .catch((error) => { if (error.name !== 'AbortError') { setFailed(true); setLoading(false) } })
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [term, searching])

  const insert = useCallback((prefix, iconName) => {
    const area = areaRef.current
    const token = iconToken(prefix, iconName)
    const start = area?.selectionStart ?? value.length
    const end = area?.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`
    onChange({ target: { name, value: next, type: 'textarea' } })
    requestAnimationFrame(() => {
      if (!area) return
      area.focus()
      const caret = start + token.length
      area.setSelectionRange(caret, caret)
    })
  }, [name, onChange, value])

  const list = searching && results ? results : QUICK_ICONS

  return (
    <div className="icon-field full">
      <div className="icon-field-head">
        <span>{label}</span>
        <button type="button" className="icon-field-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span aria-hidden="true">☺</span> آیکون
        </button>
      </div>
      <textarea ref={areaRef} name={name} rows={rows} value={value} onChange={onChange} placeholder={placeholder} />
      {open && (
        <div className="icon-panel" role="dialog" aria-label="انتخاب آیکون">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} dir="ltr" placeholder="جست‌وجو (انگلیسی): telegram, chart, bitcoin..." aria-label="جست‌وجوی آیکون" autoFocus />
          {loading && <p className="icon-panel-note">در حال جست‌وجو...</p>}
          {failed && <p className="icon-panel-note">جست‌وجو انجام نشد؛ اتصال را بررسی کن.</p>}
          {!loading && !failed && searching && results && results.length === 0 && <p className="icon-panel-note">آیکونی پیدا نشد؛ عبارت انگلیسی دیگری امتحان کن.</p>}
          {!searching && <p className="icon-panel-note">پیشنهادها — برای جست‌وجوی هزاران آیکون تایپ کن</p>}
          <div className="icon-grid">
            {list.map(([prefix, iconName]) => (
              <button type="button" key={`${prefix}/${iconName}`} title={iconName} onClick={() => insert(prefix, iconName)}>
                <img src={iconUrl(prefix, iconName)} alt={iconName} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default IconTextarea
