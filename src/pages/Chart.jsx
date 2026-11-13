import BitycleWidget from '../components/BitycleWidget'
import './Chart.css'

// صفحهٔ نمودار تمام‌صفحه است: بدون هدر و فوتر، فقط با یک دکمهٔ شناور برای برگشت
function Chart() {
  return (
    <section className="chart-page">
      <h1 className="sr-only">نمودار زنده بیت‌کوین</h1>
      <BitycleWidget height="100%" />
      <a className="chart-back" href="/" aria-label="بازگشت به صفحه اصلی چارت مسترز">
        <span aria-hidden="true">→</span> صفحه اصلی
      </a>
    </section>
  )
}

export default Chart
