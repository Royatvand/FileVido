const SITE_URL = 'https://www.chartmasters.top'

function escapeXml(value = '') {
  return String(value).replace(/[<>&'"\u0000-\u001f]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[char] || '')
}

export default async function handler(_req, res) {
  const urls = ['/', '/videos', '/chart', '/about']

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/videos?select=slug&status=eq.published&order=created_at.desc`,
        { headers: { apikey: supabaseKey } },
      )

      if (response.ok) {
        const videos = await response.json()
        for (const video of videos) {
          if (video.slug) urls.push(`/video/${encodeURIComponent(video.slug)}`)
        }
      }
    }
  } catch (error) {
    console.error('Sitemap video lookup failed:', error)
  }

  const entries = [...new Set(urls)].map((path) => (
    `  <url><loc>${escapeXml(new URL(path, SITE_URL).toString())}</loc></url>`
  )).join('\n')

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
  )
}
