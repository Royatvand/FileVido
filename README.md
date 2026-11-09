# ChartMasters | چارت مسترز

پلتفرم فارسی آموزش بازارهای مالی با ویدیوهای آموزشی منتخب و ترجمه فارسی.

## فناوری‌ها
- React
- Vite
- Tailwind CSS
- Supabase
- Vercel

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
قبل از هر انتشار جدید `versionCode` را در `android/app/build.gradle` یکی زیاد کن.
