import { useEffect, useRef, useState } from 'react'

const SCRIPT_SRC = 'https://widget.bitycle.com/static/script/v1/script.js'
const SCRIPT_ID = 'bitycle-script'
const WIDGET_ID = 'bitycle-ac-widget'

// نماد و منبع ثابت نمی‌کنیم تا جست‌وجو به یک نماد یا صرافی محدود نشود.
// برای symbol_modal، قابلیت‌های جست‌وجوی لازم طبق مستندات Bitycle فعال‌اند.
const widgetConfig = {
  id: WIDGET_ID,
  theme: 'bitycle',
  type: 'ac',
  locale: 'fa',
  mode: 'dark',
  style: 'tradingview',
  datafeed_type: 'general',
  interval: '1D',
  auto_save_delay_ms: 10000,
  disabled_features: [],
  enabled_features: [
    'show_search_dialog',
    'custom_symbol_search',
    'header_symbol_search',
    'allow_arbitrary_symbol_search_input',
    'symbol_search_hot_key',
  ],
  calendar_type: 'miladi',
  ai: {
    enabled: false,
    effort: 'low',
    disabled_features: [],
    enabled_features: [],
  },
  symbol_modal: {
    kind: ['forex', 'tehran_cgf', 'car', 'tehran_stock'],
  },
}

const isNativeApp =
  typeof window !== 'undefined' &&
  window.Capacitor?.isNativePlatform?.()

function BitycleWidget({ height = 550 }) {
  const holderRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (isNativeApp) return undefined

    const holder = holderRef.current
    if (!holder) return undefined

    setFailed(false)
    holder.replaceChildren()

    const container = document.createElement('div')
    container.id = WIDGET_ID
    container.style.width = '100%'
    container.style.height =
      typeof height === 'number' ? `${height}px` : height

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.type = 'text/javascript'
    script.src = SCRIPT_SRC
    script.async = true
    // Bitycle config را از متن تگ اسکریپت می‌خواند؛ شناسه تگ هم مطابق نمونه رسمی است.
    script.textContent = JSON.stringify(widgetConfig)
    script.onerror = () => setFailed(true)

    holder.append(container, script)

    return () => {
      script.onerror = null
      holder.replaceChildren()
    }
  }, [height])

  if (isNativeApp) {
    return (
      <div className="bitycle-fallback" style={{ minHeight: 260 }}>
        <p>نمودار پیشرفته در مرورگر نمایش داده می‌شود.</p>
        <a
          className="primary-button"
          href="https://www.chartmasters.top/chart"
          target="_blank"
          rel="noopener noreferrer"
        >
          باز کردن نمودار در مرورگر <span aria-hidden="true">↗</span>
        </a>
      </div>
    )
  }

  return (
    <div className="bitycle-widget">
      <div
        ref={holderRef}
        style={{ width: '100%', height: '100%' }}
      />
      {failed && (
        <div className="bitycle-fallback" role="status">
          <p>اسکریپت نمودار بارگذاری نشد. اتصال به سرویس Bitycle را بررسی کن.</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => window.location.reload()}
          >
            تلاش دوباره
          </button>
        </div>
      )}
    </div>
  )
}

export default BitycleWidget
