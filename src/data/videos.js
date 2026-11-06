// داده‌های آزمایشی ویدیوها برای بررسی چیدمان صفحه
// همه کارت‌ها فعلاً به یک ویدیوی واقعی آپارات متصل‌اند.
// بعداً هر کارت را با ویدیو، عنوان و کاور اختصاصی خودش جایگزین کن.

export const videos = [
  {
    id: 'aparat-demo-1',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی TradeFarsi ساخته شده است.',
    cover: '/covers/cover-1.svg',
    category: 'آموزش ترید',
  },
  {
    id: 'aparat-demo-2',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی TradeFarsi ساخته شده است.',
    cover: '/covers/cover-2.svg',
    category: 'آموزش ترید',
  },
  {
    id: 'aparat-demo-3',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی TradeFarsi ساخته شده است.',
    cover: '/covers/cover-3.svg',
    category: 'آموزش ترید',
  },
  {
    id: 'aparat-demo-4',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی TradeFarsi ساخته شده است.',
    cover: '/covers/cover-4.svg',
    category: 'آموزش ترید',
  },
  {
    id: 'aparat-demo-5',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی TradeFarsi ساخته شده است.',
    cover: '/covers/cover-5.svg',
    category: 'آموزش ترید',
  },
  {
    id: 'aparat-demo-6',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی TradeFarsi ساخته شده است.',
    cover: '/covers/cover-6.svg',
    category: 'آموزش ترید',
  }
]

export const getVideoById = (id) => videos.find((video) => video.id === id)

// آدرس Embed آپارات برای پخش ویدیو
export const getAparatEmbedUrl = (aparatId) =>
  `https://www.aparat.com/video/video/embed/videohash/${encodeURIComponent(aparatId)}/vt/frame`
