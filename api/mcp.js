import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'

export const config = { runtime: 'edge' }

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''
const MAX_ROWS = 1000

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('اتصال Supabase برای MCP تنظیم نشده است. متغیرهای URL و Publishable Key را در Vercel بررسی کنید.')
  }
}

function toolResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

function toolError(error) {
  const message = error instanceof Error ? error.message : 'در اجرای ابزار خطایی رخ داد.'
  return { isError: true, content: [{ type: 'text', text: message }] }
}

async function supabaseGet(resource, params = {}, accessToken = '') {
  requireSupabaseConfig()
  const url = new URL(`${SUPABASE_URL}/rest/v1/${resource}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Accept: 'application/json',
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const response = await fetch(url, { headers, cache: 'no-store' })
  if (!response.ok) {
    // Do not pass upstream response bodies to the model: they may contain internal schema details.
    throw new Error(`خواندن اطلاعات از دیتابیس انجام نشد (HTTP ${response.status}).`)
  }
  return response.json()
}

async function verifySupabaseUser(accessToken) {
  requireSupabaseConfig()
  if (!accessToken) {
    throw new Error('این ابزار به ورود کاربر نیاز دارد. اتصال باید با نشست معتبر چارت مسترز احراز هویت شود.')
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('نشست کاربری معتبر نیست یا منقضی شده است. دوباره وارد حساب چارت مسترز شوید.')
  }

  const user = await response.json()
  if (!user?.id) throw new Error('هویت کاربر از Supabase تأیید نشد.')
  return user
}

function readBearerToken(request) {
  const header = request?.headers?.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function safeSearchTerm(value) {
  return String(value || '')
    .trim()
    .slice(0, 80)
    .replace(/[,*()\\%]/g, ' ')
    .replace(/\s+/g, ' ')
}

function createServer(requestInfo) {
  const request = requestInfo?.request
  const accessToken = readBearerToken(request)
  let userPromise

  const requireUser = () => {
    if (!userPromise) userPromise = verifySupabaseUser(accessToken)
    return userPromise
  }

  const server = new McpServer({
    name: 'chart-masters',
    version: '0.1.0',
  })

  server.registerTool(
    'search_videos',
    {
      title: 'جست‌وجوی ویدیوهای آموزشی',
      description: 'جست‌وجو در ویدیوهای منتشرشده چارت مسترز بر اساس عنوان یا توضیحات. فقط محتوای عمومی و منتشرشده برگردانده می‌شود.',
      inputSchema: z.object({
        query: z.string().max(80).default('').describe('عبارت جست‌وجو؛ خالی باشد جدیدترین ویدیوها برمی‌گردند.'),
        limit: z.number().int().min(1).max(20).default(10).describe('حداکثر تعداد نتیجه'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ query, limit }) => {
      try {
        const term = safeSearchTerm(query)
        const params = {
          select: 'id,slug,title,description,cover_url,duration,level,instructor,tags,created_at',
          status: 'eq.published',
          order: 'created_at.desc',
          limit,
        }
        if (term) params.or = `(title.ilike.*${term}*,description.ilike.*${term}*)`
        const rows = await supabaseGet('videos', params)
        return toolResult(rows.map((video) => ({
          slug: video.slug,
          title: video.title,
          description: video.description,
          duration: video.duration,
          level: video.level,
          instructor: video.instructor,
          tags: video.tags || [],
          cover: video.cover_url || null,
          url: `https://chartmasters.top/video/${encodeURIComponent(video.slug)}`,
          publishedAt: video.created_at,
        })))
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'list_courses',
    {
      title: 'فهرست دوره‌های آموزشی',
      description: 'فهرست دوره‌ها و جلسه‌های منتشرشده هر دوره را از چارت مسترز می‌خواند.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(10).describe('حداکثر تعداد دوره'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit }) => {
      try {
        const courses = await supabaseGet('playlists', {
          select: 'id,title,slug,description,created_at',
          status: 'eq.published',
          order: 'created_at.desc',
          limit,
        })
        if (!courses.length) return toolResult([])

        const courseIds = courses.map((course) => course.id)
        const memberships = await supabaseGet('playlist_videos', {
          select: 'playlist_id,video_id,position',
          playlist_id: `in.(${courseIds.join(',')})`,
          order: 'position.asc',
          limit: 500,
        })
        const videoIds = [...new Set(memberships.map((item) => item.video_id))]
        const videos = videoIds.length
          ? await supabaseGet('videos', {
              select: 'id,slug,title,duration,status',
              id: `in.(${videoIds.join(',')})`,
              status: 'eq.published',
              limit: 500,
            })
          : []
        const videosById = new Map(videos.map((video) => [video.id, video]))

        return toolResult(courses.map((course) => ({
          title: course.title,
          slug: course.slug,
          description: course.description,
          url: `https://chartmasters.top/videos`,
          lessons: memberships
            .filter((item) => item.playlist_id === course.id)
            .sort((a, b) => a.position - b.position)
            .map((item) => videosById.get(item.video_id))
            .filter(Boolean)
            .map((video) => ({
              title: video.title,
              slug: video.slug,
              duration: video.duration,
              url: `https://chartmasters.top/video/${encodeURIComponent(video.slug)}`,
            })),
        })))
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'list_indicators',
    {
      title: 'فهرست اندیکاتورها',
      description: 'اندیکاتورها و اسکریپت‌های منتشرشده چارت مسترز را می‌خواند. مسیر فایل‌ها و اطلاعات خصوصی ذخیره‌سازی افشا نمی‌شوند.',
      inputSchema: z.object({
        platform: z.enum(['all', 'tradingview', 'metatrader4', 'metatrader5', 'other']).default('all'),
        limit: z.number().int().min(1).max(30).default(20),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ platform, limit }) => {
      try {
        const params = {
          select: 'title,slug,description,platform,version,cover_url,download_count,created_at',
          status: 'eq.published',
          order: 'created_at.desc',
          limit,
        }
        if (platform !== 'all') params.platform = `eq.${platform}`
        const rows = await supabaseGet('indicators', params)
        return toolResult(rows.map((item) => ({
          ...item,
          url: `https://chartmasters.top/indicator/${encodeURIComponent(item.slug)}`,
        })))
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'get_my_learning_progress',
    {
      title: 'گزارش پیشرفت یادگیری من',
      description: 'با نشست تأییدشده کاربر، تعداد ویدیوهای شروع‌شده و تکمیل‌شده و آخرین فعالیت آموزشی همان کاربر را می‌دهد. اطلاعات هر کاربر فقط با توکن خودش خوانده می‌شود و RLS دیتابیس همچنان اعمال می‌شود.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const user = await requireUser()
        const rows = await supabaseGet('user_video_progress', {
          select: 'last_watched_at,is_completed,completed_at',
          user_id: `eq.${user.id}`,
          order: 'last_watched_at.desc',
          limit: MAX_ROWS,
        }, accessToken)
        return toolResult({
          startedVideos: rows.length,
          completedVideos: rows.filter((row) => row.is_completed).length,
          inProgressVideos: rows.filter((row) => !row.is_completed).length,
          lastActivityAt: rows[0]?.last_watched_at || null,
          note: rows.length === MAX_ROWS ? 'برای محدودیت پاسخ، حداکثر ۱۰۰۰ رکورد بررسی شد.' : undefined,
        })
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'get_my_activity_heatmap',
    {
      title: 'هیت‌مپ فعالیت من',
      description: 'فعالیت آموزشی کاربر واردشده را در ۳۶۵ روز اخیر، بر اساس تاریخ آخرین مشاهده هر ویدیو، به شکل داده روزانه برمی‌گرداند. هر ویدیو در هر روز حداکثر یک بار شمرده می‌شود؛ این داده تعداد نشست‌های تماشا نیست.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const user = await requireUser()
        const start = new Date()
        start.setUTCHours(0, 0, 0, 0)
        start.setUTCDate(start.getUTCDate() - 364)
        const rows = await supabaseGet('user_video_progress', {
          select: 'last_watched_at',
          user_id: `eq.${user.id}`,
          last_watched_at: `gte.${start.toISOString()}`,
          order: 'last_watched_at.asc',
          limit: MAX_ROWS,
        }, accessToken)

        const counts = new Map()
        for (const row of rows) {
          if (!row.last_watched_at) continue
          const day = new Date(row.last_watched_at).toISOString().slice(0, 10)
          counts.set(day, (counts.get(day) || 0) + 1)
        }

        const days = []
        for (let offset = 0; offset < 365; offset += 1) {
          const date = new Date(start)
          date.setUTCDate(start.getUTCDate() + offset)
          const key = date.toISOString().slice(0, 10)
          days.push({ date: key, count: counts.get(key) || 0 })
        }

        return toolResult({
          periodDays: 365,
          activeDays: days.filter((day) => day.count > 0).length,
          totalVideoActivityDays: days.reduce((sum, day) => sum + day.count, 0),
          days,
          note: 'شمارش بر اساس رکورد آخرین مشاهده هر ویدیو است، نه تعداد دفعات یا مدت‌زمان تماشا.',
        })
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'list_my_favorites',
    {
      title: 'علاقه‌مندی‌های من',
      description: 'ویدیوهای ذخیره‌شده در علاقه‌مندی‌های حساب کاربر واردشده را نمایش می‌دهد.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit }) => {
      try {
        const user = await requireUser()
        const favorites = await supabaseGet('user_favorites', {
          select: 'created_at,video_id',
          user_id: `eq.${user.id}`,
          order: 'created_at.desc',
          limit,
        }, accessToken)
        if (!favorites.length) return toolResult([])

        const ids = [...new Set(favorites.map((item) => item.video_id))]
        const videos = await supabaseGet('videos', {
          select: 'id,slug,title,duration,status',
          id: `in.(${ids.join(',')})`,
          status: 'eq.published',
          limit,
        }, accessToken)
        const byId = new Map(videos.map((video) => [video.id, video]))
        return toolResult(favorites.map((favorite) => {
          const video = byId.get(favorite.video_id)
          if (!video) return null
          return {
            title: video.title,
            slug: video.slug,
            duration: video.duration,
            savedAt: favorite.created_at,
            url: `https://chartmasters.top/video/${encodeURIComponent(video.slug)}`,
          }
        }).filter(Boolean))
      } catch (error) {
        return toolError(error)
      }
    },
  )

  return server
}

const mcpHandler = createMcpHandler(createServer, { responseMode: 'json' })

function unauthorizedResponse() {
  const resourceMetadata = 'https://chartmasters.top/.well-known/oauth-protected-resource/api/mcp'
  return new Response(JSON.stringify({
    error: 'unauthorized',
    error_description: 'برای اتصال به ابزارهای چارت مسترز، ابتدا حساب کاربری خود را متصل کنید.',
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadata}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'WWW-Authenticate',
    },
  })
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
        'Access-Control-Expose-Headers': 'WWW-Authenticate',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST, DELETE, OPTIONS' } })
  }

  const accessToken = readBearerToken(request)
  if (!accessToken) return unauthorizedResponse()

  try {
    await verifySupabaseUser(accessToken)
  } catch {
    return unauthorizedResponse()
  }

  const response = await mcpHandler.fetch(request)
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
