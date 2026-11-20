-- App version catalog for Android update management.
-- Public clients may only read published rows; writes are restricted to admin role.
create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  version_code integer not null,
  version_name text not null,
  changelog text not null default '',
  download_url text not null,
  is_mandatory boolean not null default false,
  rollout_percentage smallint not null default 10,
  is_paused boolean not null default false,
  paused_at timestamptz,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_versions_version_code_positive check (version_code > 0),
  constraint app_versions_rollout_percentage_check check (rollout_percentage in (10, 25, 50, 100)),
  constraint app_versions_version_name_not_empty check (char_length(trim(version_name)) > 0),
  constraint app_versions_download_url_not_empty check (char_length(trim(download_url)) > 0)
);

create unique index if not exists app_versions_version_code_uidx
  on public.app_versions (version_code);

create index if not exists app_versions_published_code_idx
  on public.app_versions (is_published, is_paused, version_code desc);

alter table public.app_versions enable row level security;

-- Public clients read published versions; admins can also read drafts.
drop policy if exists "Public can read published app versions" on public.app_versions;
drop policy if exists "Admins can read all app versions" on public.app_versions;
drop policy if exists "Public and admins can read app versions" on public.app_versions;
create policy "Public and admins can read app versions"
  on public.app_versions for select
  using (
    is_published = true
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins can insert app versions" on public.app_versions;
create policy "Admins can insert app versions"
  on public.app_versions for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update app versions" on public.app_versions;
create policy "Admins can update app versions"
  on public.app_versions for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete app versions" on public.app_versions;
create policy "Admins can delete app versions"
  on public.app_versions for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.app_versions to anon, authenticated;
grant insert, update, delete on public.app_versions to authenticated;
