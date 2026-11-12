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

## ورود با شماره موبایل (پیامک ملی پیامک)

جریان: سایت از Supabase کد می‌خواهد ← Supabase تابع `api/send-sms-hook` را صدا می‌زند ← این تابع کد را با الگوی تأییدشده در ملی پیامک می‌فرستد.

۱. **SQL:** محتوای `supabase/profiles.sql` را یک بار در Supabase → SQL Editor اجرا کن.
۲. **متغیرهای محیطی Vercel** (Settings → Environment Variables؛ هرگز در گیت نگذار):
   - `MELIPAYAMAK_USERNAME`، `MELIPAYAMAK_PASSWORD`
   - `MELIPAYAMAK_BODY_ID` = `453363` (الگوی «کاربر گرامی کد تایید شما {0} می‌باشد»)
   - `SEND_SMS_HOOK_SECRET` (در مرحله ۴ از Supabase می‌گیری)
۳. **Supabase → Authentication → Providers → Phone:** فعالش کن (تنظیم Twilio لازم نیست).
۴. **Supabase → Authentication → Hooks → Send SMS:** نوع HTTPS، آدرس `https://www.chartmasters.top/api/send-sms-hook`؛ Secret تولیدشده (`v1,whsec_...`) را در `SEND_SMS_HOOK_SECRET` بگذار و دوباره دیپلوی کن.
۵. در همان بخش Auth، حد ارسال پیامک (SMS rate limit) را کم نگه دار تا اعتبار پنل خالی نشود.
۶. در پنل ملی پیامک، «IP مجاز» نباید برای وب‌سرویس الزامی باشد (خطای 109)، چون IP تابع‌های Vercel ثابت نیست.
