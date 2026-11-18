-- فایل‌های PDF همراه پلی‌لیست‌ها (جزوه، چک‌لیست، ...) — یک بار در Supabase → SQL Editor اجرا شود
create table if not exists public.playlist_files (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  title text not null,
  file_path text not null,
  file_name text not null default '',
  file_size bigint not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists playlist_files_playlist_id_idx on public.playlist_files(playlist_id);

alter table public.playlist_files enable row level security;

drop policy if exists "Admins manage playlist files" on public.playlist_files;
create policy "Admins manage playlist files"
on public.playlist_files for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- فایل‌های پلی‌لیست‌های منتشرشده برای همه قابل مشاهده است
drop policy if exists "Public can read files of published playlists" on public.playlist_files;
create policy "Public can read files of published playlists"
on public.playlist_files for select to anon, authenticated
using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_files.playlist_id and p.status = 'published'
  )
);

grant select on public.playlist_files to anon, authenticated;
grant insert, update, delete on public.playlist_files to authenticated;

-- باکت فایل‌ها: عمومی (دانلود رایگان)، فقط PDF، حداکثر ۲۰ مگابایت
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('playlist-files', 'playlist-files', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload playlist files" on storage.objects;
create policy "Admins upload playlist files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'playlist-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins update playlist files" on storage.objects;
create policy "Admins update playlist files"
  on storage.objects for update to authenticated
  using (bucket_id = 'playlist-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'playlist-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins delete playlist files" on storage.objects;
create policy "Admins delete playlist files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'playlist-files' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
