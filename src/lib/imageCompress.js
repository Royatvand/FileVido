// فشرده‌سازی تصویر در مرورگر پیش از آپلود: کوچک‌کردن به عرض مشخص و تبدیل به WebP.
// اگر مرورگر نتواند WebP بسازد، یا نتیجه کوچک‌تر نشود، همان فایل اصلی برگردانده می‌شود.

const DEFAULT_MAX_WIDTH = 1600
const DEFAULT_QUALITY = 0.82

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

// خروجی: { blob, type } — همیشه چیزی قابل آپلود برمی‌گرداند
export async function compressImage(file, { maxWidth = DEFAULT_MAX_WIDTH, quality = DEFAULT_QUALITY } = {}) {
  const original = { blob: file, type: file.type }
  try {
    // 'from-image' جهت EXIF (عکس‌های موبایل) را اعمال می‌کند تا تصویر کج نشود
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxWidth / bitmap.width)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await canvasToBlob(canvas, 'image/webp', quality)
    // مرورگرهایی که WebP را پشتیبانی نمی‌کنند PNG برمی‌گردانند؛ در آن حالت فایل اصلی می‌ماند
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return original
    return { blob, type: 'image/webp' }
  } catch {
    return original
  }
}
