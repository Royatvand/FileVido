-- Gallery images for indicator detail pages.
-- Run through Supabase migrations; public reads are limited to published indicators.
create table if not exists public.indicator_images (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.indicators(id) on delete cascade,
  file_path text not null unique,
  caption text not null default '',
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists indicator_images_indicator_position_idx
  on public.indicator_images (indicator_id, position, created_at);

alter table public.indicator_images enable row level security;

drop policy if exists "Public can read images of published indicators" on public.indicator_images;
create policy "Public can read images of published indicators"
  on public.indicator_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.indicators i
      where i.id = indicator_id
        and (i.status = 'published' or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

drop policy if exists "Admins manage indicator images" on public.indicator_images;
create policy "Admins manage indicator images"
  on public.indicator_images for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on table public.indicator_images to anon, authenticated;
grant insert, update, delete on table public.indicator_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('indicator-images', 'indicator-images', true, 5242880)
on conflict (id) do update
  set name = excluded.name, public = true, file_size_limit = excluded.file_size_limit;

drop policy if exists "Admins upload indicator gallery images" on storage.objects;
create policy "Admins upload indicator gallery images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'indicator-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins update indicator gallery images" on storage.objects;
create policy "Admins update indicator gallery images"
  on storage.objects for update to authenticated
  using (bucket_id = 'indicator-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'indicator-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins delete indicator gallery images" on storage.objects;
create policy "Admins delete indicator gallery images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'indicator-images' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
