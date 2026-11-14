import BitycleWidget from '../components/BitycleWidget'
import ChartReplay from '../components/ChartReplay'
import './Chart.css'

// داخل اپ اندروید ویجت نمایش داده نمی‌شود، پس لایهٔ تمرین هم لازم نیست
const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

// صفحهٔ نمودار تمام‌صفحه است: بدون هدر و فوتر، فقط با یک دکمهٔ شناور برای برگشت
function Chart() {
  return (
    <section className="chart-page">
      <h1 className="sr-only">نمودار زنده بیت‌کوین</h1>
      <BitycleWidget height="100%" />
      {!isNativeApp && <ChartReplay />}
      <a className="chart-back" href="/" aria-label="بازگشت به صفحه اصلی چارت مسترز">
        <span aria-hidden="true">→</span> صفحه اصلی
      </a>
    </section>
  )
}

export default Chart
