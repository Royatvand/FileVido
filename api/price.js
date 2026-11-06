// Vercel Serverless Function: GET /api/price
//
// قیمت بیت‌کوین را سمت سرور از چند منبع عمومی می‌گیرد و به مرورگر برمی‌گرداند.
// مرورگر فقط با دامنه خود سایت صحبت می‌کند، پس فیلتر بودن Binance/Kraken/Coinbase
// برای کاربر مهم نیست. منابع به ترتیب امتحان می‌شوند تا اولین منبع سالم جواب بدهد.
//
// خروجی: { source, symbol, price, changePct, history: [{ time, value }], updatedAt }
// time به ثانیه (Unix) است.

const TIMEOUT_MS = 6000
const MAX_POINTS = 120

async function getJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'TradeFarsi/1.0' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

// data-api.binance.vision نسخه فقط‌خواندنیِ داده‌های عمومی Binance است و از سرورهای آمریکا هم در دسترس است.
async function fromBinance() {
  // کندل‌های ۱ ثانیه‌ای؛ اگر در دسترس نبود به کندل ۱ دقیقه‌ای برمی‌گردیم
  const getKlines = async () => {
    try {
      return await getJson(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1s&limit=${MAX_POINTS}`)
    } catch {
      return getJson(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=${MAX_POINTS}`)
    }
  }
  const [klines, ticker] = await Promise.all([
    getKlines(),
    getJson('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT'),
  ])
  const history = klines.map((k) => ({ time: Math.floor(Number(k[0]) / 1000), value: Number(k[4]) }))
  return { source: 'Binance', symbol: 'BTC/USDT', price: Number(ticker.lastPrice), changePct: Number(ticker.priceChangePercent), history }
}

async function fromCoinbase() {
  const [candles, stats] = await Promise.all([
    getJson('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60'),
    getJson('https://api.exchange.coinbase.com/products/BTC-USD/stats'),
  ])
  // هر کندل: [time, low, high, open, close, volume] و جدیدترین‌ها اول هستند
  const history = candles.slice(0, MAX_POINTS).reverse().map((c) => ({ time: Number(c[0]), value: Number(c[4]) }))
  const price = Number(stats.last)
  const open = Number(stats.open)
  return { source: 'Coinbase', symbol: 'BTC/USD', price, changePct: open ? ((price - open) / open) * 100 : NaN, history }
}

async function fromKraken() {
  const [ohlc, ticker] = await Promise.all([
    getJson('https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1'),
    getJson('https://api.kraken.com/0/public/Ticker?pair=XBTUSD'),
  ])
  if (ohlc.error?.length || ticker.error?.length) throw new Error('Kraken error')
  const candles = Object.entries(ohlc.result).find(([key]) => key !== 'last')?.[1] || []
  const history = candles.slice(-MAX_POINTS).map((c) => ({ time: Number(c[0]), value: Number(c[4]) }))
  const t = Object.values(ticker.result)[0]
  const price = Number(t.c[0])
  const open = Number(t.o)
  return { source: 'Kraken', symbol: 'BTC/USD', price, changePct: open ? ((price - open) / open) * 100 : NaN, history }
}

const providers = [fromBinance, fromCoinbase, fromKraken]

function isValid(data) {
  return data && Number.isFinite(data.price) && data.price > 0 && Array.isArray(data.history) && data.history.length > 0
    && data.history.every((p) => Number.isFinite(p.time) && Number.isFinite(p.value))
}

export async function loadPrice() {
  const errors = []
  for (const provider of providers) {
    try {
      const data = await provider()
      if (isValid(data)) {
        return { ...data, changePct: Number.isFinite(data.changePct) ? data.changePct : null, updatedAt: Date.now() }
      }
      errors.push(`${provider.name}: invalid data`)
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`)
    }
  }
  const failure = new Error('All price providers failed')
  failure.details = errors
  throw failure
}

export default async function handler(request, response) {
  try {
    const data = await loadPrice()
    // کش ۱ ثانیه‌ای روی CDN تا با تعداد زیاد بازدیدکننده به منابع بیرونی فشار نیاید
    response.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=5')
    response.status(200).json(data)
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store')
    response.status(502).json({ error: error.message, details: error.details })
  }
}
