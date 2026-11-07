// داده‌های آزمایشی ویدیوها برای نسخه فعلی چارت مسترز
// همه موارد فعلاً به یک ویدیوی واقعی آپارات متصل‌اند؛ این داده‌ها صرفاً نمایشی‌اند.

export const videos = [
  {
    id: 'aparat-demo-1',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    playlistLabel: 'آشنایی با محتوای آموزشی',
    description: 'این ویدیو برای آزمایش تجربه تماشای چارت مسترز قرار داده شده است. در نسخه نهایی، توضیحات کامل آموزش، سرفصل‌ها و نکات مهم این بخش از پنل مدیریت ثبت خواهند شد.',
    cover: '/covers/cover-1.svg',
    category: 'آموزش ترید',
    duration: '12:30',
    level: 'مقدماتی',
    instructor: 'چارت مسترز',
    tags: ['آموزش ترید', 'بازارهای مالی'],
    playlistId: 'demo-learning-path',
  },
  {
    id: 'aparat-demo-2',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    playlistLabel: 'مفاهیم پایه بازار',
    description: 'این توضیحات نمونه است و برای نمایش چیدمان صفحه استفاده می‌شود. بعداً توضیحات واقعی هر ویدیو از پنل مدیریت وارد خواهد شد.',
    cover: '/covers/cover-2.svg',
    category: 'آموزش ترید',
    duration: '18:45',
    level: 'مقدماتی',
    instructor: 'چارت مسترز',
    tags: ['مفاهیم پایه', 'آموزش'],
    playlistId: 'demo-learning-path',
  },
  {
    id: 'aparat-demo-3',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    playlistLabel: 'مرور و جمع‌بندی',
    description: 'محتوای این بخش آزمایشی است. در نسخه نهایی، توضیحات اختصاصی و نکات کلیدی هر جلسه در این قسمت نمایش داده می‌شوند.',
    cover: '/covers/cover-3.svg',
    category: 'آموزش ترید',
    duration: '15:20',
    level: 'مقدماتی',
    instructor: 'چارت مسترز',
    tags: ['مرور', 'یادگیری'],
    playlistId: 'demo-learning-path',
  },
  {
    id: 'aparat-demo-4',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی چارت مسترز ساخته شده است.',
    cover: '/covers/cover-4.svg',
    category: 'آموزش ترید',
    duration: '10:15',
    level: 'متوسط',
    instructor: 'چارت مسترز',
    tags: ['آموزش ترید'],
  },
  {
    id: 'aparat-demo-5',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی چارت مسترز ساخته شده است.',
    cover: '/covers/cover-5.svg',
    category: 'آموزش ترید',
    duration: '09:40',
    level: 'متوسط',
    instructor: 'چارت مسترز',
    tags: ['آموزش ترید'],
  },
  {
    id: 'aparat-demo-6',
    aparatId: 'gvtvv7m',
    title: 'آموزش ترید — ویدیوی آزمایشی',
    description: 'این کارت برای تست نمایش و پخش ویدیو در نسخه آزمایشی چارت مسترز ساخته شده است.',
    cover: '/covers/cover-6.svg',
    category: 'آموزش ترید',
    duration: '14:05',
    level: 'پیشرفته',
    instructor: 'چارت مسترز',
    tags: ['آموزش ترید'],
  },
]

export const playlists = [
  {
    id: 'demo-learning-path',
    title: 'مسیر آشنایی با ترید',
    description: 'این پلی‌لیست نمونه برای نمایش قابلیت جلسات و جابه‌جایی بین ویدیوهاست.',
    videoIds: ['aparat-demo-1', 'aparat-demo-2', 'aparat-demo-3'],
  },
]

export const getVideoById = (id) => videos.find((video) => video.id === id)

export const getPlaylistForVideo = (videoId) => {
  return playlists.find((playlist) => playlist.videoIds.includes(videoId))
}

// آدرس Embed آپارات برای پخش ویدیو
export const getAparatEmbedUrl = (aparatId) =>
  `https://www.aparat.com/video/video/embed/videohash/${encodeURIComponent(aparatId)}/vt/frame`
