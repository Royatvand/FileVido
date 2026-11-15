// ثابت‌ها و کمک‌تابع‌های مشترک بخش اندیکاتور (صفحه‌ها، ادمین و آپلود)

export const INDICATOR_PLATFORMS = {
  tradingview: { label: 'TradingView', help: 'فایل یا کد Pine Script را در Pine Editor تریدینگ‌ویو باز کن و روی «Add to chart» بزن.' },
  metatrader4: { label: 'MetaTrader 4', help: 'فایل را در پوشهٔ MQL4 مسیر File ← Open Data Folder قرار بده (Indicators یا Experts) و متاتریدر را ری‌استارت کن.' },
  metatrader5: { label: 'MetaTrader 5', help: 'فایل را در پوشهٔ MQL5 مسیر File ← Open Data Folder قرار بده (Indicators یا Experts) و متاتریدر را ری‌استارت کن.' },
  other: { label: 'سایر پلتفرم‌ها', help: 'راهنمای نصب این فایل را در توضیحات همین صفحه ببین.' },
}

// فقط فرمت‌هایی که اجرای مستقیم در مرورگر ندارند (بدون html/js/svg)
export const INDICATOR_EXTENSIONS = ['pine', 'txt', 'mq4', 'mq5', 'ex4', 'ex5', 'zip', 'rar', '7z', 'cs', 'algo']
export const INDICATOR_MAX_BYTES = 10 * 1024 * 1024

export function getIndicatorExtension(fileName = '') {
  const parts = String(fileName).toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : ''
}

export function formatFileSize(bytes = 0) {
  const size = Number(bytes) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

// آدرس دانلود؛ پارامتر download باعث می‌شود Supabase فایل را با نام اصلی دانلود کند
export function indicatorImageUrl(filePath) {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base || !filePath) return ''
  return `${base}/storage/v1/object/public/indicator-images/${filePath}`
}

export function indicatorDownloadUrl(indicator) {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base || !indicator?.file_path) return ''
  return `${base}/storage/v1/object/public/indicator-files/${indicator.file_path}?download=${encodeURIComponent(indicator.file_name || 'indicator')}`
}
