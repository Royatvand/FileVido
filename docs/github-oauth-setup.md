# فعال‌سازی ورود با GitHub در ChartMasters

این قابلیت از Supabase Auth استفاده می‌کند و نشست کاربران را در همان فضای کاربری فعلی ذخیره می‌کند. ورود مدیر در مسیر `/admin/login` مستقل می‌ماند و با GitHub Login تغییر نمی‌کند.

## 1. ساخت GitHub OAuth App

در GitHub به مسیر **Settings → Developer settings → OAuth Apps → New OAuth App** برو و این مقادیر را ثبت کن:

- **Application name:** ChartMasters
- **Homepage URL:** `https://chartmasters.top`
- **Authorization callback URL:**

```
https://bpvkdtwlcpfsnvmhzagd.supabase.co/auth/v1/callback
```

این Callback مربوط به Supabase است، نه مسیر `/login` سایت.

بعد از ساخت OAuth App، مقدار **Client ID** و **Client Secret** را دریافت کن.

## 2. فعال‌سازی در Supabase

در پروژه Supabase با شناسه `bpvkdtwlcpfsnvmhzagd`:

1. وارد **Authentication → Sign In / Providers → GitHub** شو.
2. GitHub Provider را فعال کن.
3. Client ID و Client Secret را وارد و ذخیره کن.
4. مطمئن شو URL Configuration اجازه بازگشت به آدرس‌های موردنیاز را می‌دهد:
   - `https://chartmasters.top/login`
   - `https://www.chartmasters.top/login`
   - `http://localhost:5173/login` برای توسعه محلی
   - `chartmasters://auth` برای بازگشت به اپ اندروید (همان deep link فعلی Google)

اگر از آدرس Preview دیگری برای تست استفاده می‌کنی، همان آدرس دقیق `/login` را نیز به Redirect URLs اضافه کن.

## 3. امنیت

- Client Secret فقط در تنظیمات Supabase وارد شود.
- هرگز Client Secret را در فایل‌های `.env` فرانت‌اند، GitHub یا کد React قرار نده.
- GitHub Login فقط ورود کاربر عادی است؛ نقش ادمین را اعطا نمی‌کند.
- مجوز ادمین همچنان از `app_metadata.role === 'admin'` بررسی می‌شود.

## 4. تست

1. ابتدا GitHub Provider را در Supabase فعال کن.
2. نسخه Preview شاخه `feat/github-oauth-login` را باز کن.
3. در `/login` گزینه «ادامه با حساب گیت‌هاب» را بزن.
4. پس از تأیید GitHub باید به `/dashboard` برگردی.
5. ورود با گوگل و ورود مدیر را هم دوباره بررسی کن.
