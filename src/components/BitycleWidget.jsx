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
  enabled_features: [
    'compact_price',
    'override_theme',
    'replay',
    'custom_saveload',
    'chart_crosshair_context_menu',
    'save_chart_properties_to_local_storage',
    'items_favoriting',
    'chart_crosshair_menu',
    'use_localstorage_for_settings',
    'trading_account_manager',
    'right_bar_stays_on_scroll',
    'hide_right_toolbar',
    'constraint_dialogs_movement',
    'charting_library_debug_mode',
    'header_compare',
    'header_indicators',
    'header_undo_redo',
    'header_screenshot',
    'header_fullscreen_button',
    'header_saveload',
    'left_toolbar',
    'timeframes_toolbar',
    'display_legend_on_all_charts',
    'object_tree_legend_mode',
    'format_button_in_legend',
    'delete_button_in_legend',
    'show_hide_button_in_legend',
    'edit_buttons_in_legend',
    'countdown',
    'dont_show_boolean_study_arguments',
    'symbol_info',
    'hide_last_na_study_output',
    'go_to_date',
    'source_selection_markers',
    'snapshot_trading_drawings',
    'header_widget',
    'header_symbol_search',
  ],
  calendar_type: 'miladi',
  ai: { enabled: false, effort: 'low', disabled_features: [], enabled_features: [] },
  source_priority: ['binance_spot'],
  symbol_modal: {
    kind: [
      'tehran_stock',
      'car',
      'tehran_cgf',
      'forex',
      'crypto',
      'swap',
      'structured',
      'stock',
      'index',
      'futures',
      'fund',
      'economic',
      'dr',
      'bond',
      'commodity',
    ],
  },
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
    container.style.cssText = `width:100%;height:${typeof height === 'number' ? `${height}px` : height}`
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
      <div className="bitycle-fallback" style={{ minHeight: 260 }}>
        <p>نمودار پیشرفته در مرورگر نمایش داده می‌شود.</p>
        <a className="primary-button" href="https://www.chartmasters.top/chart" target="_blank" rel="noopener noreferrer">باز کردن نمودار در مرورگر <span aria-hidden="true">↗</span></a>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="bitycle-widget">
      <div ref={holderRef} style={{ height: '100%' }} />
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
