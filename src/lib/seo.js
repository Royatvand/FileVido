const SITE_URL = 'https://chartmasters.top'

function upsertMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function setPageSeo({ title, description, path = '/', image } = {}) {
  const pageTitle = title || 'چارت مسترز | ChartMasters'
  const pageDescription = description || 'آموزش بازارهای مالی با ویدیوهای آموزشی منتخب و ترجمه فارسی.'
  const canonicalUrl = new URL(path, SITE_URL).toString()

  document.title = pageTitle
  upsertMeta('name', 'description', pageDescription)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:site_name', 'ChartMasters')
  upsertMeta('property', 'og:title', pageTitle)
  upsertMeta('property', 'og:description', pageDescription)
  upsertMeta('property', 'og:url', canonicalUrl)
  upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  upsertMeta('name', 'twitter:title', pageTitle)
  upsertMeta('name', 'twitter:description', pageDescription)

  if (image) {
    const imageUrl = new URL(image, SITE_URL).toString()
    upsertMeta('property', 'og:image', imageUrl)
    upsertMeta('name', 'twitter:image', imageUrl)
  }

  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', canonicalUrl)
}
