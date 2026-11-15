import './RichText.css'
import { ICON_TOKEN_RE, iconUrl } from '../lib/iconTokens'

// متن ساده + آیکون‌های رنگی؛ بدون innerHTML (فقط <img> با آدرس ساخته‌شده از نام مجموعه/آیکون)
function RichText({ text = '' }) {
  const source = String(text)
  const parts = []
  let last = 0
  for (const match of source.matchAll(ICON_TOKEN_RE)) {
    if (match.index > last) parts.push(source.slice(last, match.index))
    parts.push({ prefix: match[1], name: match[2], key: match.index })
    last = match.index + match[0].length
  }
  if (last < source.length) parts.push(source.slice(last))
  return parts.map((part, index) => (typeof part === 'string'
    ? part
    : <img key={`${part.key}-${index}`} className="inline-icon" src={iconUrl(part.prefix, part.name)} alt="" loading="lazy" decoding="async" />))
}

export default RichText
