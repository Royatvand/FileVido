-- جدول بنرهای اسلایدر صفحه اصلی TradeFarsi
-- این فایل را یک بار در Supabase اجرا کن.

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  image_url text not null,
  link_url text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners enable row level security;

-- دسترسی خواندن بنرها برای کاربران عمومی (فقط بنرهای فعال)
drop policy if exists "Public can read active banners" on public.banners;
create policy "Public can read active banners"
  on public.banners for select
  to anon, authenticated
  using (is_active = true);

-- فقط مدیر دارای app_metadata.role = admin اجازه مدیریت دارد
drop policy if exists "Admins manage banners" on public.banners;
create policy "Admins manage banners"
  on public.banners for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- دسترسی Data API؛ کنترل نهایی ردیف‌ها همچنان با RLS انجام می‌شود
grant select on table public.banners to anon;
grant select, insert, update, delete on table public.banners to authenticated;
