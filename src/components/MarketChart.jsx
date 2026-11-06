import { useEffect, useState } from 'react'
import { Liveline } from 'liveline'
import './MarketChart.css'

const REST_URL = 'https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1'
const SOCKET_URL = 'wss://ws.kraken.com/v2'
const MAX_POINTS = 180

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
  const [connection, setConnection] = useState('connecting')

  useEffect(() => {
    let disposed = false
    let socket
    let reconnectTimer
    let historyController

    async function loadHistory() {
      historyController = new AbortController()
      const timeout = window.setTimeout(() => historyController.abort(), 10000)

      try {
        const response = await fetch(REST_URL, { signal: historyController.signal })
        if (!response.ok) throw new Error(`Kraken history request failed: ${response.status}`)

        const payload = await response.json()
        if (payload.error?.length) throw new Error(payload.error.join(', '))

        const pairKey = Object.keys(payload.result || {}).find((key) => key !== 'last')
        const candles = pairKey ? payload.result[pairKey] : []
        const history = candles
          .map((candle) => ({
            time: Number(candle[0]),
            value: Number(candle[4]),
          }))
          .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
          .slice(-MAX_POINTS)

        if (!disposed && history.length) {
          const latestHistoryPoint = history[history.length - 1]

          setData((current) => {
            // Keep live ticks that may have arrived while the REST request was running.
            const livePoints = current.filter((point) => point.time > latestHistoryPoint.time)
            return [...history, ...livePoints].slice(-MAX_POINTS)
          })
          setPrice((current) => current ?? latestHistoryPoint.value)
        }
      } catch (error) {
        if (!disposed) {
          console.warn('Kraken historical data unavailable:', error)
        }
      } finally {
        window.clearTimeout(timeout)
      }
    }

    function connect() {
      if (disposed) return

      window.clearTimeout(reconnectTimer)
      setConnection('connecting')

      let currentSocket
      try {
        currentSocket = new WebSocket(SOCKET_URL)
        socket = currentSocket
      } catch (error) {
        console.warn('Could not create Kraken WebSocket:', error)
        setConnection('reconnecting')
        reconnectTimer = window.setTimeout(connect, 3000)
        return
      }

      currentSocket.onopen = () => {
        if (disposed) return
        currentSocket.send(JSON.stringify({
          method: 'subscribe',
          params: {
            channel: 'ticker',
            symbol: ['BTC/USD'],
            event_trigger: 'trades',
            snapshot: true,
          },
        }))
      }

      currentSocket.onmessage = (event) => {
        if (disposed) return

        try {
          const message = JSON.parse(event.data)

          if (message.success === false || message.error) {
            console.warn('Kraken ticker subscription error:', message.error || message)
            setConnection('reconnecting')
            return
          }

          if (message.channel !== 'ticker' || !Array.isArray(message.data)) return
          const ticker = message.data.find((item) => item.symbol === 'BTC/USD')
          const nextPrice = Number(ticker?.last)
          const nextChange = Number(ticker?.change_pct)

          if (!Number.isFinite(nextPrice) || nextPrice <= 0) return

          setPrice(nextPrice)
          if (Number.isFinite(nextChange)) setChangePct(nextChange)
          setConnection('live')

          setData((current) => {
            const nextPoint = { time: Date.now() / 1000, value: nextPrice }
            return [...current, nextPoint].slice(-MAX_POINTS)
          })
        } catch (error) {
          console.warn('Could not parse Kraken ticker message:', error)
        }
      }

      currentSocket.onerror = () => currentSocket.close()
      currentSocket.onclose = () => {
        if (disposed || socket !== currentSocket) return
        setConnection('reconnecting')
        reconnectTimer = window.setTimeout(connect, 3000)
      }
    }

    // Start both sources independently: a slow REST request must not block live prices.
    connect()
    loadHistory()

    return () => {
      disposed = true
      window.clearTimeout(reconnectTimer)
      window.clearTimeout(historyController?.timeout)
      historyController?.abort()
      socket?.close()
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
        <span>BTC / USD · KRAKEN</span>
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
          loading={data.length === 0}
          emptyText="داده‌ای برای نمایش وجود ندارد"
          grid={false}
          badge={false}
          momentum
          scrub
          lineWidth={2}
        />
      </div>

      <div className="chart-footer">
        <span>MARKET DATA · SPOT</span>
        <span>BTC/USD</span>
      </div>
    </div>
  )
}

export default MarketChart
