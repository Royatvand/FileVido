export const FONT_STORAGE_KEY = 'chartmasters-font'

export const SITE_FONTS = [
  {
    id: 'vazirmatn',
    label: 'وزیرمتن',
    description: 'فونت پیش‌فرض سایت',
    sample: 'چارت مسترز؛ پرایس اکشن ۱۲۳',
    family: "'Vazirmatn', sans-serif",
  },
  {
    id: 'dastkhat',
    label: 'دستخط',
    description: 'نقطه‌های مربعی، مناسب متن',
    sample: 'چارت مسترز؛ پرایس اکشن ۱۲۳',
    family: "'Dastkhat FaNum', 'Vazirmatn', sans-serif",
  },
  {
    id: 'diamond',
    label: 'دستخط الماسی',
    description: 'نقطه‌های لوزی و نرم‌تر',
    sample: 'چارت مسترز؛ پرایس اکشن ۱۲۳',
    family: "'Dastkhat Diamond FaNum', 'Vazirmatn', sans-serif",
  },
  {
    id: 'dots',
    label: 'دستخط گرد',
    description: 'نقطه‌های دایره‌ای',
    sample: 'چارت مسترز؛ پرایس اکشن ۱۲۳',
    family: "'Dastkhat Dots FaNum', 'Vazirmatn', sans-serif",
  },
  {
    id: 'bar',
    label: 'دستخط خط‌دار',
    description: 'نقطه‌ها به شکل خط و مربع',
    sample: 'چارت مسترز؛ پرایس اکشن ۱۲۳',
    family: "'Dastkhat Bar FaNum', 'Vazirmatn', sans-serif",
  },
  {
    id: 'bardots',
    label: 'دستخط کپسولی',
    description: 'نقطه‌ها به شکل خط و دایره',
    sample: 'چارت مسترز؛ پرایس اکشن ۱۲۳',
    family: "'Dastkhat BarDots FaNum', 'Vazirmatn', sans-serif",
  },
  {
    id: 'mono',
    label: 'دستخط مونو',
    description: 'اعداد و لاتین با عرض یکسان',
    sample: 'ChartMasters 123 پرایس',
    family: "'Dastkhat Mono', 'Vazirmatn', sans-serif",
  },
]

const FONT_IDS = new Set(SITE_FONTS.map((font) => font.id))

export function isSiteFont(id) {
  return FONT_IDS.has(id)
}

export function readStoredFont() {
  try {
    const value = localStorage.getItem(FONT_STORAGE_KEY)
    return isSiteFont(value) ? value : 'vazirmatn'
  } catch {
    return 'vazirmatn'
  }
}

export function applySiteFont(id) {
  const font = isSiteFont(id) ? id : 'vazirmatn'
  if (font === 'vazirmatn') delete document.documentElement.dataset.font
  else document.documentElement.dataset.font = font
  try {
    if (font === 'vazirmatn') localStorage.removeItem(FONT_STORAGE_KEY)
    else localStorage.setItem(FONT_STORAGE_KEY, font)
  } catch {
    // انتخاب همین صفحه برقرار می‌ماند.
  }
  return font
}

export function applyAccountFont(metadata) {
  const font = metadata?.ui_font
  if (isSiteFont(font)) applySiteFont(font)
}
