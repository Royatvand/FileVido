# ChartMasters | چارت مسترز

پلتفرم فارسی آموزش بازارهای مالی با ویدیوهای آموزشی منتخب و ترجمه فارسی.

## فناوری‌ها
- React
- Vite
- Tailwind CSS
- Supabase
- Vercel
- Capacitor (Android)

## توسعه محلی
```bash
npm install
npm run dev
```

## دستورات
- `npm run dev`: اجرای محیط توسعه
- `npm run build`: ساخت نسخه production
- `npm run preview`: پیش‌نمایش build
- `npm run lint`: بررسی ESLint

## دامنه
https://chartmasters.top

## نکته امنیتی
کلیدهای خصوصی و مقادیر محرمانه را در مخزن قرار ندهید. متغیرهای محیطی مورد نیاز را در تنظیمات محیط اجرا تعریف کنید.

## اپ اندروید (Capacitor)

نسخه اندروید از همین کد وب ساخته می‌شود و پوشه `android/` پروژه Gradle آن است.

```bash
npm run build && npx cap sync android   # همگام‌سازی نسخه وب با اپ
```

ساخت APK در GitHub: تب **Actions → Build Android APK → Run workflow**. خروجی در بخش Artifacts است.

برای APK امضاشده (لازم برای مایکت) این Secrets را در تنظیمات ریپو بساز:
`ANDROID_KEYSTORE_BASE64`، `ANDROID_KEYSTORE_PASSWORD`، `ANDROID_KEY_ALIAS`، `ANDROID_KEY_PASSWORD`.
فایل keystore را هرگز در گیت نگذار و از آن نسخه پشتیبان نگه دار؛ برای هر آپدیت باید با همان کلید امضا شود.
قبل از هر انتشار جدید `versionCode` را در `android/app/build.gradle` یکی زیاد کن و همان عدد را در پنل ادمین (تب «نسخه اپ») ثبت کن.

### مدیریت آپدیت اپ

1. در Supabase فایل‌های SQL زیر را اجرا کن:
   - `supabase/app_versions.sql`
   - `supabase/fcm_tokens.sql`
2. در پنل ادمین → تب **نسخه اپ** نسخه جدید را با `versionCode`، `versionName`، changelog، لینک دانلود (مثلاً GitHub Release) و اجباری/اختیاری ثبت کن.
3. APK از پنل آپلود نمی‌شود؛ فقط لینک دانلود ذخیره می‌شود.
4. بررسی نسخه فقط روی Android native اجرا می‌شود؛ نسخه وب محدودیتی ندارد.

### اعلان FCM (نیازمند تنظیمات خارجی)

زیرساخت ارسال اعلان از سرور آماده است (`api/notify-app-update.js`) اما **تا وقتی کلیدهای Firebase تنظیم نشوند فعال نیست** و ادعا نمی‌شود که اعلان کار می‌کند.

برای فعال‌سازی نهایی:

1. پروژه Firebase بساز و اپ Android با `applicationId` برابر `chartmasters.app` اضافه کن.
2. فایل `google-services.json` را در مسیر `android/app/google-services.json` قرار بده (در گیت commit نکن اگر محرمانه است؛ در CI به‌صورت secret تزریق کن).
3. Service Account با نقش Firebase Cloud Messaging API Admin بساز و این متغیرها را در **Vercel** تعریف کن:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (کلید PEM؛ خط‌های جدید به‌صورت `\n`)
4. ترجیحاً `SUPABASE_SERVICE_ROLE_KEY` را هم برای خواندن توکن‌ها در سرور تنظیم کن.
5. پس از نصب اپ و اعطای مجوز اعلان، توکن‌ها در جدول `fcm_tokens` ذخیره می‌شوند.
6. با انتشار نسخه در پنل ادمین (یا دکمه «ارسال اعلان») درخواست به `/api/notify-app-update` زده می‌شود.

بدون این تنظیمات، endpoint با وضعیت `501 not_configured` پاسخ می‌دهد.
