// آیکون‌های رنگی داخل متن به‌شکل توکن ذخیره می‌شوند: :ic:<مجموعه>/<نام>:
// مثال: :ic:logos/tradingview:  ← از کتابخانهٔ Iconify (ده‌ها هزار آیکون)
export const ICON_TOKEN_RE = /:ic:([a-z0-9-]+)\/([a-z0-9-]+):/g

// فقط مجموعه‌های رنگی؛ مجموعه‌های تک‌رنگ در جست‌وجو نمی‌آیند
export const COLORED_ICON_SETS = ['logos', 'flat-color-icons', 'fluent-emoji', 'twemoji', 'noto', 'skill-icons', 'devicon', 'emojione', 'openmoji']

export const ICON_API = 'https://api.iconify.design'

export const iconToken = (prefix, name) => `:ic:${prefix}/${name}:`
export const iconUrl = (prefix, name) => `${ICON_API}/${prefix}/${name}.svg`

// برای SEO، جست‌وجو و متن ساده: توکن آیکون حذف می‌شود
export const stripIconTokens = (text = '') => String(text).replace(ICON_TOKEN_RE, '').replace(/[ \t]{2,}/g, ' ')

// آیکون‌های پیشنهادیِ بدون جست‌وجو (مرتبط با تریدینگ و شبکه‌های اجتماعی)
export const QUICK_ICONS = [
  ['logos', 'tradingview'], ['logos', 'telegram'], ['logos', 'instagram-icon'], ['logos', 'youtube-icon'],
  ['logos', 'whatsapp-icon'], ['logos', 'twitter'], ['logos', 'bitcoin'], ['logos', 'ethereum'],
  ['logos', 'binance'], ['logos', 'google-icon'], ['flat-color-icons', 'combo-chart'], ['flat-color-icons', 'bullish'],
  ['flat-color-icons', 'bearish'], ['flat-color-icons', 'idea'], ['flat-color-icons', 'download'], ['flat-color-icons', 'info'],
  ['fluent-emoji', 'chart-increasing'], ['fluent-emoji', 'chart-decreasing'], ['fluent-emoji', 'fire'], ['fluent-emoji', 'rocket'],
  ['fluent-emoji', 'check-mark-button'], ['fluent-emoji', 'warning'], ['fluent-emoji', 'money-bag'], ['fluent-emoji', 'bullseye'],
]
