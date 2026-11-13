import { useEffect, useRef, useState } from 'react'
import { useInView } from './animated/useInView'

const SCRIPT_SRC = 'https://widget.bitycle.com/static/script/v1/script.js'
const WIDGET_ID = 'bitycle-ac-widget'
const LOAD_TIMEOUT_MS = 15000

const widgetConfig = {
  id: WIDGET_ID,
  theme: 'chartmasters.top',
  type: 'ac',
  locale: 'fa',
  mode: 'dark',
  style: 'tradingview',
  datafeed_type: 'general',
  symbol: 'binance_spot:BTCUSDT',
  interval: '1M',
  disabled_features: [],
  enabled_features: [],
  calendar_type: 'miladi',
  ai: { enabled: false, effort: 'low', disabled_features: [], enabled_features: [] },
  source_priority: ['binance_spot'],
}

// ویجت فقط روی دامنه‌های وایت‌لیست‌شده کار می‌کند؛ داخل اپ اندروید آدرس صفحه https://localhost است
const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

function BitycleWidget({ height = 550 }) {
  const [wrapperRef, inView] = useInView({ margin: '200px' })
  const holderRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!inView || isNativeApp) return undefined
    const holder = holderRef.current
    if (!holder) return undefined

    // اسکریپت Bitycle تنظیمات را از متن همین تگ script می‌خواند؛ پس مثل کد اصلی بعد از div قرار می‌گیرد
    const container = document.createElement('div')
    container.id = WIDGET_ID
    container.style.cssText = `width:100%;height:${height}px`
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = SCRIPT_SRC
    script.async = true
    script.text = JSON.stringify(widgetConfig)
    script.onerror = () => setFailed(true)
    holder.append(container, script)

    // اگر بعد از چند ثانیه چیزی داخل ویجت ساخته نشد، پیام خطا نشان می‌دهیم
    const timer = setTimeout(() => {
      if (!container.childElementCount) setFailed(true)
    }, LOAD_TIMEOUT_MS)

    return () => {
      clearTimeout(timer)
      holder.replaceChildren()
    }
  }, [inView, height])

  if (isNativeApp) {
    return (
      <div className="bitycle-fallback" style={{ minHeight: height / 2 }}>
        <p>نمودار پیشرفته در مرورگر نمایش داده می‌شود.</p>
        <a className="primary-button" href="https://www.chartmasters.top/chart" target="_blank" rel="noopener noreferrer">باز کردن نمودار در مرورگر <span aria-hidden="true">↗</span></a>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="bitycle-widget" style={{ minHeight: height }}>
      <div ref={holderRef} />
      {failed && (
        <div className="bitycle-fallback" role="status">
          <p>نمودار بارگذاری نشد. اتصال اینترنت را بررسی کن و صفحه را دوباره باز کن.</p>
          <button type="button" className="secondary-button" onClick={() => window.location.reload()}>تلاش دوباره</button>
        </div>
      )}
    </div>
  )
}

export default BitycleWidget
