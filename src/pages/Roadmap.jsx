import { useEffect, useRef, useState } from 'react'
import { ROADMAPS } from '../data/roadmaps'
import './Roadmap.css'

const faDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])

function readStyle() {
  const id = new URLSearchParams(window.location.search).get('style')
  return ROADMAPS.some((item) => item.id === id) ? id : ROADMAPS[0].id
}

function Roadmap() {
  const [styleId, setStyleId] = useState(readStyle)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(0)
  const trackRef = useRef(null)
  const roadmap = ROADMAPS.find((item) => item.id === styleId) || ROADMAPS[0]

  const pick = (id) => {
    setStyleId(id)
    setActive(0)
    const url = new URL(window.location.href)
    url.searchParams.set('style', id)
    window.history.replaceState(null, '', url)
  }

  useEffect(() => {
    const update = () => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const mid = window.innerHeight * 0.55
      const value = (mid - rect.top) / rect.height
      setProgress(Math.min(1, Math.max(0, value)))
      const nodes = track.querySelectorAll('.rm-stage')
      let current = 0
      nodes.forEach((node, index) => {
        if (node.getBoundingClientRect().top < mid) current = index
      })
      setActive(current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [styleId])

  return (
    <main className="page-content roadmap-page">
      <section className="rm-hero">
        <h1>مسیر یادگیری ترید</h1>
        <p>سبک معاملاتی‌ات را انتخاب کن و مرحله‌به‌مرحله با اسکرول جلو برو.</p>
        <div className="rm-styles" role="tablist" aria-label="انتخاب سبک">
          {ROADMAPS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === styleId}
              className={`rm-style ${item.id === styleId ? 'on' : ''}`}
              onClick={() => pick(item.id)}
            >
              <strong>{item.name}</strong>
              <span>{item.tagline}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rm-track" ref={trackRef} aria-label={`مسیر ${roadmap.name}`}>
        <div className="rm-line" aria-hidden="true">
          <i style={{ height: `${progress * 100}%` }} />
        </div>
        <ol>
          {roadmap.stages.map((stage, index) => (
            <li key={`${roadmap.id}-${index}`} className={`rm-stage ${index <= active ? 'reached' : ''} ${index === active ? 'current' : ''}`}>
              <span className="rm-dot" aria-hidden="true">{faDigits(index + 1)}</span>
              <div className="rm-card">
                <h2>{stage.title}</h2>
                <p>{stage.text}</p>
                <a href="/videos">ویدیوهای مرتبط</a>
              </div>
            </li>
          ))}
        </ol>
        <div className="rm-finish">
          <strong>آماده‌ای!</strong>
          <span>حالا تمرین کن و معاملاتت را ثبت کن.</span>
          <a href="/videos">رفتن به ویدیوها</a>
        </div>
      </section>
    </main>
  )
}

export default Roadmap
