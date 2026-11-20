import { useState } from 'react'
import { openExternalUrl } from '../lib/appUpdate'
import './ShareButton.css'

const SITE_URL = 'https://www.chartmasters.top'

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M21.94 4.36a1.2 1.2 0 0 0-1.22-.2L2.9 11.05c-.9.36-.88 1.65.03 1.98l4.4 1.6 1.7 5.38c.2.64 1 .86 1.5.4l2.45-2.28 4.5 3.3c.6.44 1.45.1 1.6-.62l3.3-15.4a1.2 1.2 0 0 0-.44-1.05ZM9.6 14.05l8.2-6.45c.2-.15.4.1.23.27l-6.5 6.5-.26 2.7-1.67-3.02Z"
      />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7" />
    </svg>
  )
}

/** Telegram + copy-link share buttons. `path` is a site path such as /video/slug. */
function ShareButton({ path, title, label = 'اشتراک‌گذاری در تلگرام', className = '' }) {
  const [copied, setCopied] = useState(false)
  const url = new URL(path, SITE_URL).toString()

  function shareTelegram() {
    const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    openExternalUrl(link)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      input.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`share-buttons ${className}`.trim()}>
      <button type="button" className="share-button share-button--telegram" onClick={shareTelegram}>
        <TelegramIcon />
        <span>{label}</span>
      </button>
      <button type="button" className="share-button share-button--copy" onClick={copyLink} aria-live="polite">
        <LinkIcon />
        <span>{copied ? 'کپی شد ✓' : 'کپی لینک'}</span>
      </button>
    </div>
  )
}

export default ShareButton
