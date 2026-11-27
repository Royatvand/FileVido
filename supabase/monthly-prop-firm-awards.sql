-- Monthly Iranian prop firm awards for ChartMasters.
-- Public visitors can read active firms and published monthly awards.
-- Only users whose JWT app_metadata.role is "admin" can manage records.

create table if not exists public.prop_firms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  logo_url text not null default '',
  website_url text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_prop_awards (
  id uuid primary key default gen_random_uuid(),
  prop_firm_id uuid not null references public.prop_firms(id) on delete restrict,
  jalali_year integer not null check (jalali_year between 1300 and 1600),
  jalali_month smallint not null check (jalali_month between 1 and 12),
  firm_name_snapshot text not null,
  firm_logo_snapshot text not null,
  firm_website_snapshot text not null default '',
  description text not null default '',
  selection_reason text not null default '',
  overall_score smallint check (overall_score between 0 and 100),
  criteria_scores jsonb not null default '{}'::jsonb
    check (jsonb_typeof(criteria_scores) = 'object'),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_prop_awards_year_month_key unique (jalali_year, jalali_month)
);

create index if not exists prop_firms_active_name_idx
  on public.prop_firms (is_active, name);

create index if not exists monthly_prop_awards_published_date_idx
  on public.monthly_prop_awards (status, jalali_year desc, jalali_month desc);

create index if not exists monthly_prop_awards_firm_id_idx
  on public.monthly_prop_awards (prop_firm_id);

alter table public.prop_firms enable row level security;
alter table public.monthly_prop_awards enable row level security;

drop policy if exists "Public reads active prop firms and admins read all" on public.prop_firms;
create policy "Public reads active prop firms and admins read all"
  on public.prop_firms for select to anon, authenticated
  using (
    is_active = true
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins manage prop firms" on public.prop_firms;
create policy "Admins manage prop firms"
  on public.prop_firms for all to authenticated
  using ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
  with check ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin');

drop policy if exists "Public reads published monthly awards and admins read all" on public.monthly_prop_awards;
create policy "Public reads published monthly awards and admins read all"
  on public.monthly_prop_awards for select to anon, authenticated
  using (
    status = 'published'
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins manage monthly prop awards" on public.monthly_prop_awards;
create policy "Admins manage monthly prop awards"
  on public.monthly_prop_awards for all to authenticated
  using ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
  with check ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin');

grant select on public.prop_firms, public.monthly_prop_awards to anon, authenticated;
grant insert, update, delete on public.prop_firms, public.monthly_prop_awards to authenticated;
