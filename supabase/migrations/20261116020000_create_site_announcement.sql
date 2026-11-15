-- A single editable announcement strip shown above the site navigation.
create table if not exists public.site_announcement (
  id boolean primary key default true check (id = true),
  message text not null default '',
  image_url text not null default '',
  link_url text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_announcement enable row level security;

drop policy if exists "Public can read active site announcement" on public.site_announcement;
create policy "Public can read active site announcement"
  on public.site_announcement for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins manage site announcement" on public.site_announcement;
create policy "Admins manage site announcement"
  on public.site_announcement for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on table public.site_announcement to anon;
grant select, insert, update, delete on table public.site_announcement to authenticated;
