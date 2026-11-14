import { useCallback, useEffect, useRef, useState } from 'react'
import './ChartReplay.css'

// فاصلهٔ ناحیهٔ نمودار تا لبه‌های ویجت (نوار بالا، محور زمان، محور قیمت).
// اگر در ویجت جابه‌جا شد، فقط همین سه عدد را عوض کن.
const INSET = { top: 46, bottom: 32, right: 66 }
const STEP_MIN = 2
const STEP_MAX = 40
const PLAY_MS = 600

// لایهٔ «تمرین»: یک نقطه از چارت انتخاب می‌شود و آینده زیر یک مستطیل پنهان می‌ماند.
// این فقط یک پوشش ظاهری است و به داخل ویجت دست نمی‌زند.
function ChartReplay() {
  const layerRef = useRef(null)
  const [mode, setMode] = useState('idle') // idle | pick | run
  const [hoverX, setHoverX] = useState(null)
  const [x, setX] = useState(0)
  const [step, setStep] = useState(8)
  const [playing, setPlaying] = useState(false)
  const [lock, setLock] = useState(true)

  const maxX = useCallback(() => {
    const w = layerRef.current?.clientWidth ?? 0
    return Math.max(0, w - INSET.right)
  }, [])

  const exit = useCallback(() => {
    setMode('idle')
    setPlaying(false)
    setHoverX(null)
  }, [])

  const move = useCallback((dir) => {
    setX((cur) => Math.min(maxX(), Math.max(0, cur + dir * step)))
  }, [maxX, step])

  // پخش خودکار؛ وقتی به انتهای چارت رسید خودش می‌ایستد
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      setX((cur) => {
        const next = Math.min(maxX(), cur + step)
        if (next >= maxX()) setPlaying(false)
        return next
      })
    }, PLAY_MS)
    return () => clearInterval(id)
  }, [playing, step, maxX])

  useEffect(() => {
    if (mode === 'idle') return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') exit()
      else if (mode === 'run' && e.key === 'ArrowRight') { e.preventDefault(); move(1) }
      else if (mode === 'run' && e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
      else if (mode === 'run' && e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, exit, move])

  const relX = (e) => e.clientX - layerRef.current.getBoundingClientRect().left
  const areaStyle = { '--rp-top': `${INSET.top}px`, '--rp-bottom': `${INSET.bottom}px`, '--rp-right': `${INSET.right}px` }

  return (
    <div ref={layerRef} className="replay-layer" style={areaStyle}>
      {mode === 'pick' && (
        <div
          className="replay-pick"
          onPointerMove={(e) => setHoverX(relX(e))}
          onPointerLeave={() => setHoverX(null)}
          onPointerDown={(e) => { setX(Math.min(maxX(), Math.max(0, relX(e)))); setMode('run'); setHoverX(null) }}
        >
          {hoverX !== null && <i className="replay-guide" style={{ left: hoverX }} />}
        </div>
      )}

      {mode === 'run' && (
        <>
          {lock && <div className="replay-lock" style={{ width: x }} onWheel={(e) => e.stopPropagation()} />}
          <div className="replay-mask" style={{ left: x }}>
            <span>آینده پنهان است</span>
          </div>
        </>
      )}

      <div className="replay-panel" role="group" aria-label="تمرین بازپخش نمودار">
        {mode === 'idle' && (
          <button type="button" className="replay-btn primary" onClick={() => setMode('pick')}>▶ تمرین بازپخش</button>
        )}
        {mode === 'pick' && (
          <>
            <span className="replay-hint">روی چارت نقطهٔ شروع را انتخاب کن</span>
            <button type="button" className="replay-btn" onClick={exit}>انصراف</button>
          </>
        )}
        {mode === 'run' && (
          <>
            <button type="button" className="replay-btn" onClick={() => move(-1)} aria-label="یک قدم عقب">◀ عقب</button>
            <button type="button" className="replay-btn primary" onClick={() => move(1)} aria-label="یک قدم جلو">جلو ▶</button>
            <button type="button" className="replay-btn" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ توقف' : '⏵ پخش'}</button>
            <label className="replay-step">
              <span>قدم: {step}px</span>
              <input type="range" min={STEP_MIN} max={STEP_MAX} value={step} onChange={(e) => setStep(Number(e.target.value))} />
            </label>
            <label className="replay-check">
              <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} /> قفل چارت
            </label>
            <button type="button" className="replay-btn" onClick={() => { setPlaying(false); setMode('pick') }}>نقطهٔ جدید</button>
            <button type="button" className="replay-btn" onClick={exit}>خروج</button>
          </>
        )}
      </div>
    </div>
  )
}

export default ChartReplay
