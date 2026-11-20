import { useEffect, useState } from 'react'

function ThemeToggle({ className = '' }) {
  const [isCoral, setIsCoral] = useState(() => {
    try {
      return window.localStorage.getItem('chartmasters-theme') === 'coral'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = isCoral ? 'coral' : 'green'

    try {
      window.localStorage.setItem('chartmasters-theme', isCoral ? 'coral' : 'green')
    } catch {
      // The theme still works for the current page when storage is unavailable.
    }
  }, [isCoral])

  return (
    <button
      className={('theme-toggle ' + className).trim()}
      type="button"
      onClick={() => setIsCoral((current) => !current)}
      aria-label={isCoral ? 'بازگشت به تم سبز' : 'فعال‌کردن تم مرجانی'}
      title={isCoral ? 'بازگشت به تم سبز' : 'فعال‌کردن تم مرجانی'}
    >
      <span aria-hidden="true">{isCoral ? '☾' : '☀'}</span>
    </button>
  )
}

export default ThemeToggle
