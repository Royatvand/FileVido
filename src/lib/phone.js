// تبدیل ارقام فارسی/عربی به انگلیسی
export function toLatinDigits(value = '') {
  return String(value)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

// شماره موبایل ایران را در هر قالب رایج می‌پذیرد و { local: '0912...', e164: '+98912...' } برمی‌گرداند
export function parseIranMobile(input) {
  let digits = toLatinDigits(input).replace(/\D/g, '')
  if (digits.startsWith('0098')) digits = digits.slice(4)
  else if (digits.startsWith('98')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  if (!/^9\d{9}$/.test(digits)) return null
  return { local: `0${digits}`, e164: `+98${digits}` }
}

export function maskPhone(local = '') {
  return local.length === 11 ? `${local.slice(0, 4)}•••${local.slice(7)}` : local
}
