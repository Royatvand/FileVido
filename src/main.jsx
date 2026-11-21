import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import './light-theme.css'
import './app-update.css'

// Restore the saved theme before React paints, including standalone routes
// such as the admin dashboard and login pages where the header is not mounted.
try {
  const savedTheme = window.localStorage.getItem('chartmasters-theme')
  if (['green', 'coral', 'light'].includes(savedTheme)) {
    document.documentElement.dataset.theme = savedTheme
  }
} catch {
  // Theme persistence is optional; the default theme remains available.
}
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
