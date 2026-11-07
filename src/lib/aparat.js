// استخراج شناسه ویدیوی آپارات از لینک یا کد iframe (بدون درخواست به API)
//
// ورودی‌های پشتیبانی‌شده:
//  - کد iframe:   <iframe src="https://www.aparat.com/video/video/embed/videohash/nssb82r/vt/frame"></iframe>
//  - لینک embed:  https://www.aparat.com/video/video/embed/videohash/nssb82r/vt/frame
//  - لینک ویدیو:  https://www.aparat.com/v/nssb82r
//
// خروجی: { id } در صورت موفقیت، { error } با پیام فارسی در صورت نامعتبر بودن، و { id: '' } برای ورودی خالی.

const ERRORS = {
  invalid: 'لینک یا کد واردشده معتبر نیست. لینک ویدیو (مثل aparat.com/v/xxxxx) یا کد iframe آپارات را وارد کنید.',
  noSrc: 'در کد iframe آدرس (src) پیدا نشد. کد کامل iframe را از آپارات کپی کنید.',
  notAparat: 'فقط لینک‌های آپارات (aparat.com) پشتیبانی می‌شوند.',
  noId: 'شناسه ویدیو در این لینک پیدا نشد. لینک ویدیو یا کد iframe را بررسی کنید.',
}

const ID_PATTERN = '([A-Za-z0-9]+)'

export function extractAparatId(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return { id: '' }

  let url = raw
  if (/<\s*iframe/i.test(raw)) {
    const match = raw.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    url = (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim()
    if (!url) return { error: ERRORS.noSrc }
  }

  // فقط یک آدرس بدون فاصله قابل قبول است
  if (/\s/.test(url)) return { error: ERRORS.invalid }

  const hostMatch = url.match(/^(?:https?:)?(?:\/\/)?((?:[\w-]+\.)*aparat\.com)(?=[/?#]|$)/i)
  if (!hostMatch) {
    // چیزی شبیه آدرس (دامنه دارد) ولی آپارات نیست
    return { error: /^(?:https?:)?(?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:[/?#]|$)/i.test(url) ? ERRORS.notAparat : ERRORS.invalid }
  }

  const rest = url.slice(hostMatch[0].length).split(/[?#]/)[0]
  const match = rest.match(new RegExp(`/videohash/${ID_PATTERN}(?:/|$)`, 'i')) || rest.match(new RegExp(`^/v/${ID_PATTERN}(?:/|$)`, 'i'))
  return match ? { id: match[1] } : { error: ERRORS.noId }
}
