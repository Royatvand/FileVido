import { useEffect, useMemo, useState } from 'react'
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

    async function loadHistory() {
      try {
        const response = await fetch(REST_URL)
        if (!response.ok) throw new Error('Historical market data request failed')

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

        if (!disposed && history.length) setData(history.slice(-MAX_POINTS))
      } catch (error) {
        // The live feed can still populate the chart if historical data is unavailable.
        console.warn('Kraken historical data unavailable:', error)
      }
    }

    function connect() {
      if (disposed) return

      setConnection((current) => current === 'live' ? 'connecting' : current)
      socket = new WebSocket(SOCKET_URL)

      socket.onopen = () => {
        socket.send(JSON.stringify({
          method: 'subscribe',
          params: {
            channel: 'ticker',
            symbol: ['BTC/USD'],
            event_trigger: 'trades',
            snapshot: true,
          },
        }))
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.success === false || message.error) {
            setConnection('reconnecting')
            return
          }

          if (message.channel !== 'ticker' || !Array.isArray(message.data)) return
          const ticker = message.data.find((item) => item.symbol === 'BTC/USD')
          const nextPrice = Number(ticker?.last)
          const nextChange = Number(ticker?.change_pct)

          if (!Number.isFinite(nextPrice)) return

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

      socket.onerror = () => socket.close()
      socket.onclose = () => {
        if (disposed) return
        setConnection('reconnecting')
        reconnectTimer = window.setTimeout(connect, 3000)
      }
    }

    loadHistory().finally(() => {
      if (!disposed) connect()
    })

    return () => {
      disposed = true
      window.clearTimeout(reconnectTimer)
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
  const chartData = useMemo(() => data, [data])

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
          data={chartData}
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
