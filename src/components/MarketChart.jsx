import { useEffect, useState } from 'react'
import { Liveline } from 'liveline'
import './MarketChart.css'

// قیمت از تابع سرورلس خود سایت (/api/price) خوانده می‌شود؛ مرورگر مستقیم به صرافی‌ها وصل نمی‌شود.
// داخل اپ اندروید فایل‌ها محلی‌اند، پس API را از دامنه اصلی سایت می‌گیریم
const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
const PRICE_URL = isNativeApp ? 'https://www.chartmasters.top/api/price' : '/api/price'
const POLL_MS = 1000 // تایم‌فریم ۱ ثانیه‌ای: هر ثانیه یک نقطهٔ جدید
const MAX_POINTS = 300
const WINDOW_SECS = 60 // بازهٔ قابل مشاهده روی نمودار

function formatPrice(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function MarketChart() {
  const [data, setData] = useState([])
  const [price, setPrice] = useState(null)
  const [changePct, setChangePct] = useState(null)
  const [meta, setMeta] = useState({ source: 'Binance', symbol: 'BTC/USDT' })
  const [connection, setConnection] = useState('connecting')

  useEffect(() => {
    let disposed = false
    let timer
    let controller

    async function poll() {
      const startedAt = Date.now()
      controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 8000)
      try {
        const response = await fetch(PRICE_URL, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        if (disposed) return

        const nextPrice = Number(payload.price)
        if (!Number.isFinite(nextPrice) || nextPrice <= 0) throw new Error('invalid price')

        setPrice(nextPrice)
        setChangePct(payload.changePct !== null && Number.isFinite(Number(payload.changePct)) ? Number(payload.changePct) : null)
        setMeta({ source: payload.source, symbol: payload.symbol })
        setConnection('live')

        setData((current) => {
          const history = Array.isArray(payload.history) ? payload.history : []
          // اولین بار تاریخچه را می‌گیریم؛ بعد از آن فقط نقطه‌های زنده اضافه می‌شوند.
          const base = current.length ? current : history
          const now = Date.now() / 1000
          const last = base[base.length - 1]
          const next = last && now - last.time < 0.5 ? base : [...base, { time: now, value: nextPrice }]
          return next.slice(-MAX_POINTS)
        })
      } catch (error) {
        if (!disposed) {
          setConnection('reconnecting')
          console.warn('Price request failed:', error)
        }
      } finally {
        window.clearTimeout(timeout)
        if (!disposed) timer = window.setTimeout(poll, Math.max(0, POLL_MS - (Date.now() - startedAt)))
      }
    }

    poll()

    return () => {
      disposed = true
      window.clearTimeout(timer)
      controller?.abort()
    }
  }, [])

  const chartValue = price ?? data[data.length - 1]?.value ?? 0
  const isNegative = changePct !== null && changePct < 0
  const changeLabel = changePct === null
    ? '—'
    : `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`
  const connectionLabel = {
    connecting: 'CONNECTING',
    live: 'LIVE',
    reconnecting: 'RECONNECTING',
  }[connection] || 'CONNECTING'

  const chartColor = isNegative ? '#fb7185' : '#8CF2B1'

  return (
    <div className="visual-card market-card">
      <div className="visual-card-top">
        <span>{meta.symbol} · {meta.source?.toUpperCase()}</span>
        <span className={`live-pill ${connection === 'live' ? 'is-live' : 'is-waiting'}`}>
          <i /> {connectionLabel}
        </span>
      </div>

      <div className="market-price-row">
        <div className="chart-value market-price" aria-live="polite">
          {price === null ? 'در انتظار قیمت' : formatPrice(price)}
        </div>
        <div className={`market-change ${isNegative ? 'is-negative' : 'is-positive'}`}>
          {changeLabel}
        </div>
      </div>
      <div className="chart-label">قیمت بیت‌کوین به دلار · تغییر ۲۴ ساعته</div>

      <div className="market-chart-canvas">
        <Liveline
          data={data}
          value={chartValue}
          color={chartColor}
          theme="dark"
          window={WINDOW_SECS}
          loading={data.length === 0}
          emptyText="داده‌ای برای نمایش وجود ندارد"
          grid={false}
          badge={false}
          momentum
          scrub
          lineWidth={2}
        />
      </div>

      {connection === 'reconnecting' && (
        <div className="market-error" role="status">اتصال قیمت برقرار نشد؛ دوباره تلاش می‌کنیم…</div>
      )}

      <div className="chart-footer">
        <span>MARKET DATA · SPOT</span>
        <span>{meta.symbol}</span>
      </div>
    </div>
  )
}

export default MarketChart
