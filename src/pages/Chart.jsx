import AnimatedText from '../components/animated/AnimatedText'
import BitycleWidget from '../components/BitycleWidget'
import './Chart.css'

function Chart() {
  return (
    <section className="chart-page">
      <div className="chart-heading">
        <span className="section-kicker">بازار زنده</span>
        <h1><AnimatedText text="نمودار زنده بیت‌کوین" /></h1>
        <p>نمودار حرفه‌ای قیمت بیت‌کوین با ابزارهای تحلیل؛ بازهٔ زمانی و ابزارها را خودت انتخاب کن.</p>
      </div>
      <div className="chart-frame">
        <BitycleWidget height={550} />
      </div>
      <p className="chart-note">داده‌های نمودار از Binance و توسط سرویس Bitycle ارائه می‌شود و صرفاً جنبهٔ اطلاع‌رسانی دارد؛ توصیهٔ مالی نیست.</p>
    </section>
  )
}

export default Chart
