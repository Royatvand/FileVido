// داده‌های آزمایشی ویدیوها (Mock Data)
// برای افزودن ویدیوی جدید فقط یک آبجکت به انتهای این آرایه اضافه کن.
//
// - id:          شناسه داخلی و یکتا؛ در آدرس صفحه ویدیو استفاده می‌شود (/video/<id>)
// - aparatId:    شناسه ویدیو در آپارات (همان hash در لینک https://www.aparat.com/v/<aparatId>)
// - title:       عنوان ویدیو
// - description: توضیح کوتاه برای کارت و صفحه ویدیو
// - cover:       آدرس تصویر کاور (فایل داخل public/ یا لینک کامل)
// - category / duration / date: اطلاعات نمایشی (اختیاری)
//
// توجه: aparatId های زیر نمونه هستند؛ برای تست پخش واقعی آن‌ها را با شناسه ویدیوهای واقعی آپارات جایگزین کن.

export const videos = [
  {
    id: 'price-action-basics',
    aparatId: 'Xk3mQ',
    title: 'مبانی پرایس اکشن برای مبتدی‌ها',
    description: 'با خواندن مستقیم کندل‌ها و ساختار بازار، بدون اندیکاتور شلوغ، تصمیم‌های معاملاتی بهتری بگیر.',
    cover: '/covers/cover-1.svg',
    category: 'پرایس اکشن',
    duration: '۲۴:۱۰',
    date: '۱۴۰۵/۰۸/۱۰',
  },
  {
    id: 'risk-management-101',
    aparatId: 'Tz9aP',
    title: 'مدیریت ریسک؛ مهم‌ترین مهارت یک تریدر',
    description: 'حجم معامله، حد ضرر و نسبت ریسک به ریوارد را یاد بگیر تا سرمایه‌ات در امان بماند.',
    cover: '/covers/cover-2.svg',
    category: 'مدیریت ریسک',
    duration: '۱۸:۴۵',
    date: '۱۴۰۵/۰۸/۱۲',
  },
  {
    id: 'trading-psychology',
    aparatId: 'Lp7rW',
    title: 'روانشناسی ترید و کنترل احساسات',
    description: 'ترس، طمع و انتقام از بازار؛ چطور ذهنت را برای ترید منضبط کنی.',
    cover: '/covers/cover-3.svg',
    category: 'روانشناسی',
    duration: '۳۱:۲۰',
    date: '۱۴۰۵/۰۸/۱۴',
  },
  {
    id: 'support-resistance',
    aparatId: 'Hc2dN',
    title: 'حمایت و مقاومت؛ از صفر تا کاربرد واقعی',
    description: 'سطوح کلیدی را درست رسم کن و بفهم چرا قیمت بارها به آن‌ها واکنش نشان می‌دهد.',
    cover: '/covers/cover-4.svg',
    category: 'تحلیل تکنیکال',
    duration: '۲۲:۰۵',
    date: '۱۴۰۵/۰۸/۱۶',
  },
  {
    id: 'trading-plan',
    aparatId: 'Bv5sY',
    title: 'ساخت پلن معاملاتی شخصی',
    description: 'قدم‌به‌قدم یک پلن معاملاتی بنویس که با سبک و سرمایه‌ات هماهنگ باشد.',
    cover: '/covers/cover-5.svg',
    category: 'استراتژی',
    duration: '۲۷:۳۰',
    date: '۱۴۰۵/۰۸/۱۸',
  },
  {
    id: 'market-structure',
    aparatId: 'Qn8eU',
    title: 'ساختار بازار و روند‌های اصلی',
    description: 'سقف و کف‌ها، شکست ساختار و تشخیص روند؛ پایه‌ای که هر تحلیلی روی آن بنا می‌شود.',
    cover: '/covers/cover-6.svg',
    category: 'تحلیل تکنیکال',
    duration: '۲۰:۵۰',
    date: '۱۴۰۵/۰۸/۲۰',
  },
]

export const getVideoById = (id) => videos.find((video) => video.id === id)

// آدرس Embed آپارات برای پخش ویدیو
export const getAparatEmbedUrl = (aparatId) =>
  `https://www.aparat.com/video/video/embed/videohash/${encodeURIComponent(aparatId)}/vt/frame`
