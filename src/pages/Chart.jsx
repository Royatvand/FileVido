import { useEffect } from 'react'
import BitycleWidget from '../components/BitycleWidget'
import './Chart.css'

// صفحهٔ نمودار تمام‌صفحه است: ارتفاع = ارتفاع صفحه منهای هدر، بدون فوتر
function Chart() {
  useEffect(() => {
    const header = document.querySelector('.site-header')
    const update = () => document.documentElement.style.setProperty('--header-h', `${header?.offsetHeight || 84}px`)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <section className="chart-page">
      <h1 className="sr-only">نمودار زنده بیت‌کوین</h1>
      <BitycleWidget height="100%" />
    </section>
  )
}

export default Chart
