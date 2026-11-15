-- اسکریپت‌ها و اندیکاتورهای قابل دانلود (یک بار در Supabase → SQL Editor اجرا شود)

create table if not exists public.indicators (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  content text not null default '',
  platform text not null default 'tradingview' check (platform in ('tradingview', 'metatrader4', 'metatrader5', 'other')),
  version text not null default '1.0',
  cover_url text not null default '',
  file_path text not null default '',
  file_name text not null default '',
  file_size bigint not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.indicators enable row level security;

drop policy if exists "Public can read published indicators" on public.indicators;
create policy "Public can read published indicators"
  on public.indicators for select
  to anon, authenticated
  using (status = 'published' or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins manage indicators" on public.indicators;
create policy "Admins manage indicators"
  on public.indicators for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on table public.indicators to anon;
grant select, insert, update, delete on table public.indicators to authenticated;

-- شمارندهٔ دانلود: بدون دسترسی نوشتن مستقیم، فقط از این تابع افزایش می‌یابد
create or replace function public.increment_indicator_downloads(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.indicators
  set download_count = download_count + 1
  where slug = p_slug and status = 'published';
$$;

revoke all on function public.increment_indicator_downloads(text) from public;
grant execute on function public.increment_indicator_downloads(text) to anon, authenticated;

-- فضای ذخیرهٔ فایل‌ها (عمومی برای دانلود، آپلود فقط مدیر)
insert into storage.buckets (id, name, public, file_size_limit)
values ('indicator-files', 'indicator-files', true, 10485760)
on conflict (id) do update
  set name = excluded.name,
      public = true,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "Admins upload indicator files" on storage.objects;
create policy "Admins upload indicator files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'indicator-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins update indicator files" on storage.objects;
create policy "Admins update indicator files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'indicator-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'indicator-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins delete indicator files" on storage.objects;
create policy "Admins delete indicator files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'indicator-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
