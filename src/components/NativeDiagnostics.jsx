import { useState } from 'react'

// فقط داخل اپ اندروید نمایش داده می‌شود؛ برای پیدا کردن علت مشکل اتصال
const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

async function probe(name, url, options) {
  const started = Date.now()
  try {
    const response = await fetch(url, { ...options, cache: 'no-store' })
    return `${name}: HTTP ${response.status} (${Date.now() - started}ms)`
  } catch (error) {
    return `${name}: خطا - ${error.name}: ${error.message}`
  }
}

function NativeDiagnostics() {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState([])

  if (!isNativeApp) return null

  async function run() {
    setOpen(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    const base = [
      `آدرس صفحه: ${window.location.href}`,
      `navigator.onLine: ${navigator.onLine}`,
      `تنظیم Supabase در اپ: ${supabaseUrl ? 'دارد' : 'ندارد'} / کلید: ${key ? 'دارد' : 'ندارد'}`,
      `نسخه مرورگر داخلی: ${navigator.userAgent}`,
    ]
    setLines([...base, 'در حال تست...'])
    const results = await Promise.all([
      probe('سایت chartmasters.top/api/price', 'https://chartmasters.top/api/price'),
      supabaseUrl
        ? probe('Supabase', `${supabaseUrl}/rest/v1/videos?select=id&limit=1`, { headers: { apikey: key } })
        : Promise.resolve('Supabase: تنظیم نشده'),
      probe('آپارات', 'https://www.aparat.com/', { mode: 'no-cors' }),
    ])
    setLines([...base, ...results])
  }

  return (
    <div style={{ position: 'fixed', bottom: 12, left: 12, zIndex: 9999, direction: 'rtl', fontSize: 12 }}>
      {open && (
        <pre style={{ maxWidth: 'calc(100vw - 24px)', margin: '0 0 8px', padding: 12, borderRadius: 10, background: '#0b120e', color: '#cfe', border: '1px solid #8cf2b155', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>{lines.join('\n')}</pre>
      )}
      <button type="button" onClick={open ? () => setOpen(false) : run} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #8cf2b155', background: '#0b120e', color: '#8cf2b1', font: 'inherit' }}>
        {open ? 'بستن' : 'تشخیص اتصال'}
      </button>
    </div>
  )
}

export default NativeDiagnostics
