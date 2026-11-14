// Vercel Serverless Function: همهٔ آدرس‌های صفحه‌ها از اینجا رد می‌شوند (rewrite در vercel.json).
//
// سایت یک SPA است و قبلاً هر آدرسی، حتی اشتباه، کد ۲۰۰ می‌گرفت (soft 404) و گوگل آن را ایندکس می‌کرد.
// اینجا آدرس را بررسی می‌کنیم: صفحه‌های واقعی index.html را با کد ۲۰۰ می‌گیرند
// و آدرس‌های ناموجود همان index.html را با کد ۴۰۴ (تا React صفحهٔ «پیدا نشد» را نشان بدهد).
// فایل‌های واقعی (assets، favicon و...) پیش از rewrite از خود Vercel سرو می‌شوند و به اینجا نمی‌رسند.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { videos as demoVideos } from '../src/data/videos.js'

const STATIC_PAGES = new Set(['/', '/videos', '/chart', '/about', '/admin', '/admin/login'])
const DEMO_SLUGS = new Set(demoVideos.map((video) => video.id))
const SLUG_PATTERN = /^[^/\s]{1,200}$/

async function loadIndexHtml(request) {
  try {
    return await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8')
  } catch {
    // اگر فایل داخل بستهٔ تابع نبود، از خود دامنه می‌خوانیم (index.html فایل ثابت است و rewrite نمی‌شود)
    const host = request.headers['x-forwarded-host'] || request.headers.host
    const response = await fetch(`https://${host}/index.html`)
    if (!response.ok) throw new Error(`index.html HTTP ${response.status}`)
    return response.text()
  }
}

// true = ویدیو منتشرشده وجود دارد، false = ندارد، null = نتوانستیم بررسی کنیم
async function videoExists(slug) {
  if (DEMO_SLUGS.has(slug)) return true
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/videos?select=slug&status=eq.published&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { headers: { apikey: supabaseKey }, signal: controller.signal },
    )
    clearTimeout(timer)
    if (!response.ok) return null
    const rows = await response.json()
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return null
  }
}

export async function resolveStatus(rawPath) {
  let path = String(rawPath || '/')
  try { path = decodeURIComponent(path) } catch { return 404 }
  path = `/${path.replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/'

  if (STATIC_PAGES.has(path)) return 200
  const match = path.match(/^\/video\/([^/]+)$/)
  if (match && SLUG_PATTERN.test(match[1])) {
    const exists = await videoExists(match[1])
    // اگر دیتابیس در دسترس نبود، صفحهٔ احتمالاً درست را ۴۰۴ نمی‌کنیم
    return exists === false ? 404 : 200
  }
  return 404
}

export default async function handler(request, response) {
  try {
    const status = await resolveStatus(request.query?.path)
    const html = await loadIndexHtml(request)
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=60, stale-while-revalidate=300' : 'public, s-maxage=60')
    // صفحهٔ ۴۰۴ نباید ایندکس شود
    if (status === 404) response.setHeader('X-Robots-Tag', 'noindex')
    response.status(status).send(html)
  } catch (error) {
    console.error('Page handler failed:', error)
    response.status(500).send('خطای موقت سرور؛ چند لحظه بعد دوباره تلاش کنید.')
  }
}
