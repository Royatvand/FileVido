import { useEffect, useState } from 'react'
import './ShareDialog.css'

function BrandIcon({ type }) {
  if (type === 'whatsapp') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.5 23.5l6-1.6A11.8 11.8 0 0 0 20.5 3.5ZM12 21a9.2 9.2 0 0 1-4.7-1.3l-.4-.2-3.5.9.9-3.4-.2-.4A9.2 9.2 0 1 1 12 21Zm5-6.9c-.3-.2-1.7-.9-2-.9s-.5-.2-.7.2-.8.9-.9 1.1-.3.2-.6.1a7.5 7.5 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.3 1 2.6 1.1 2.8 2 3.1 4.9 4.3c.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4s.2-1.3.1-1.4-.2-.2-.5-.3Z"/></svg>
  if (type === 'telegram') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.7 4.2-3.3 15.5c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6.1 13.2l-4.9-1.5c-1.1-.3-1.1-1.1.2-1.6L20.6 3c.9-.3 1.7.2 1.1 1.2Z"/></svg>
  if (type === 'sms') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 5v2h12V9H6Zm0 4v2h8v-2H6Z"/></svg>
  if (type === 'copy') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3v-2h3V5h-9v3H8Zm-3 3v10h9V11H5Zm-2-2h13v14H3V9Z"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm2.1-7.7-.9.9c-.7.6-1.2 1.1-1.2 2.3h-2c0-1.8.7-2.7 1.6-3.5l1.1-1a1.7 1.7 0 1 0-2.9-1.2h-2a3.7 3.7 0 1 1 6.3 2.5Z"/></svg>
}

function ShareDialog({ open, onClose, title, path }) {
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState('')
  const url = typeof window !== 'undefined' ? new URL(path, window.location.origin).toString() : path
  const message = title ? `${title} — چارت مسترز` : 'مشاهده آموزش در چارت مسترز'

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  async function copyLink() {
    setShareError('')
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const field = document.createElement('textarea')
      field.value = url
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      const success = document.execCommand('copy')
      field.remove()
      if (!success) {
        setShareError('کپی خودکار انجام نشد؛ لینک را انتخاب و کپی کنید.')
        return
      }
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  async function nativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({ title: message, text: message, url })
      onClose()
    } catch (error) {
      if (error?.name !== 'AbortError') setShareError('اشتراک‌گذاری انجام نشد؛ روش دیگری را امتحان کنید.')
    }
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedMessage = encodeURIComponent(message)
  const options = [
    { type: 'whatsapp', label: 'واتساپ', detail: 'ارسال برای مخاطب یا گروه', href: `https://wa.me/?text=${encodedMessage}%20${encodedUrl}` },
    { type: 'telegram', label: 'تلگرام', detail: 'ارسال در گفتگو یا کانال', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}` },
    { type: 'sms', label: 'پیامک', detail: 'ارسال لینک با پیامک', href: `sms:?body=${encodedMessage}%20${encodedUrl}` },
  ]

  return (
    <div className="share-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
        <div className="share-dialog-topline"><span className="share-dialog-mark">CM</span><button type="button" className="share-dialog-close" onClick={onClose} aria-label="بستن پنجره">×</button></div>
        <div className="share-dialog-heading"><span>هم‌رسانی دانش</span><h2 id="share-dialog-title">این آموزش رو به اشتراک بذار</h2><p>دوستات هم می‌تونن از این آموزش استفاده کنن.</p></div>
        <div className="share-dialog-video"><span className="share-dialog-video-icon">▶</span><div><strong>{title}</strong><small>آموزش در چارت مسترز</small></div></div>
        <div className="share-dialog-options">
          {options.map((option) => <a key={option.type} className={`share-dialog-option share-dialog-option--${option.type}`} href={option.href} target={option.type === 'sms' ? undefined : '_blank'} rel="noreferrer" onClick={onClose}><span className="share-dialog-option-icon"><BrandIcon type={option.type} /></span><span className="share-dialog-option-copy"><strong>{option.label}</strong><small>{option.detail}</small></span><span className="share-dialog-option-arrow">←</span></a>)}
        </div>
        {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="share-dialog-native" onClick={nativeShare}><BrandIcon type="more" /> سایر برنامه‌ها و روش‌ها</button>}
        <div className="share-dialog-link-label">یا لینک مستقیم آموزش</div>
        <div className="share-dialog-link-row"><span dir="ltr">{url}</span><button type="button" onClick={copyLink}><BrandIcon type="copy" />{copied ? 'کپی شد' : 'کپی لینک'}</button></div>
        {shareError && <p className="share-dialog-error" role="alert">{shareError}</p>}
        <p className="share-dialog-footnote">لینک مستقیم ویدیو؛ قابل ارسال در هر پیام‌رسان دیگری</p>
      </section>
    </div>
  )
}

export default ShareDialog
