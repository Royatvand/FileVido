import { useEffect, useState } from 'react'

const themes = ['green', 'coral', 'light']

const themeLabels = {
  green: 'سبز',
  coral: 'مرجانی',
  light: 'روشن',
}

const themeIcons = {
  green: '☀',
  coral: '☾',
  light: '◐',
}

function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem('chartmasters-theme')
      return themes.includes(savedTheme) ? savedTheme : 'green'
    } catch {
      return 'green'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    try {
      window.localStorage.setItem('chartmasters-theme', theme)
    } catch {
      // The selected theme still works for the current page when storage is unavailable.
    }
  }, [theme])

  const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length]

  return (
    <button
      className={('theme-toggle ' + className).trim()}
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`فعال‌کردن تم ${themeLabels[nextTheme]}`}
      title={`تم بعدی: ${themeLabels[nextTheme]}`}
    >
      <span aria-hidden="true">{themeIcons[theme]}</span>
    </button>
  )
}

export default ThemeToggle
