-- ChartMasters site analytics
-- Stores pseudonymous visitor/session IDs; raw IP addresses are never stored.

create table if not exists public.site_pageviews (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  session_id uuid not null,
  path text not null check (char_length(path) between 1 and 300),
  referrer_host text not null default '',
  device_type text not null default 'unknown'
    check (device_type in ('desktop', 'mobile', 'tablet', 'unknown')),
  created_at timestamptz not null default now()
);

create index if not exists site_pageviews_created_at_idx
  on public.site_pageviews (created_at desc);
create index if not exists site_pageviews_visitor_created_idx
  on public.site_pageviews (visitor_id, created_at desc);
create index if not exists site_pageviews_path_created_idx
  on public.site_pageviews (path, created_at desc);

alter table public.site_pageviews enable row level security;
revoke all on table public.site_pageviews from public, anon, authenticated, service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role, authenticated;

create table if not exists private.site_analytics_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  event_count integer not null default 0,
  updated_at timestamptz not null default now()
);
revoke all on table private.site_analytics_rate_limits from public, anon, authenticated, service_role;
alter table private.site_analytics_rate_limits enable row level security;

create or replace function private.record_site_pageview(
  p_visitor_id uuid,
  p_session_id uuid,
  p_path text,
  p_referrer_host text,
  p_device_type text,
  p_ip_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_event_count integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_visitor_id is null
     or p_session_id is null
     or p_path is null
     or p_path !~ '^/[^?#]*$'
     or char_length(p_path) > 300
     or p_path ~* '^/(admin|login|oauth|dashboard)(/|$)'
     or p_device_type is null
     or p_device_type not in ('desktop', 'mobile', 'tablet', 'unknown')
     or p_ip_hash is null
     or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid analytics event' using errcode = '22023';
  end if;

  insert into private.site_analytics_rate_limits (ip_hash, window_started_at, event_count, updated_at)
  values (p_ip_hash, now(), 1, now())
  on conflict (ip_hash) do update
    set window_started_at = case
          when private.site_analytics_rate_limits.window_started_at <= now() - interval '1 minute'
            then now()
          else private.site_analytics_rate_limits.window_started_at
        end,
        event_count = case
          when private.site_analytics_rate_limits.window_started_at <= now() - interval '1 minute'
            then 1
          else private.site_analytics_rate_limits.event_count + 1
        end,
        updated_at = now()
  returning event_count into v_event_count;

  if v_event_count > 180 then
    return false;
  end if;

  -- Avoid duplicate events caused by React StrictMode or rapid re-renders.
  if exists (
    select 1
    from public.site_pageviews pv
    where pv.visitor_id = p_visitor_id
      and pv.session_id = p_session_id
      and pv.path = p_path
      and pv.created_at >= now() - interval '3 seconds'
  ) then
    return false;
  end if;

  insert into public.site_pageviews (
    visitor_id, session_id, path, referrer_host, device_type
  ) values (
    p_visitor_id,
    p_session_id,
    p_path,
    left(coalesce(p_referrer_host, ''), 255),
    p_device_type
  );

  return true;
end;
$function$;

revoke all on function private.record_site_pageview(uuid, uuid, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function private.record_site_pageview(uuid, uuid, text, text, text, text)
  to service_role;

-- Public Data API wrapper; only the server's service-role request may execute it.
create or replace function public.record_site_pageview(
  p_visitor_id uuid,
  p_session_id uuid,
  p_path text,
  p_referrer_host text,
  p_device_type text,
  p_ip_hash text
)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  select private.record_site_pageview(
    p_visitor_id, p_session_id, p_path, p_referrer_host, p_device_type, p_ip_hash
  );
$function$;

revoke all on function public.record_site_pageview(uuid, uuid, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_site_pageview(uuid, uuid, text, text, text, text)
  to service_role;

create or replace function private.get_site_analytics(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_summary jsonb;
  v_daily jsonb;
  v_top_pages jsonb;
  v_referrers jsonb;
  v_devices jsonb;
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_from is null
     or p_to is null
     or p_to <= p_from
     or p_to > p_from + interval '366 days' then
    raise exception 'Invalid analytics date range' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'page_views', (select count(*) from public.site_pageviews where created_at >= p_from and created_at < p_to),
    'unique_visitors', (select count(distinct visitor_id) from public.site_pageviews where created_at >= p_from and created_at < p_to),
    'sessions', (select count(distinct session_id) from public.site_pageviews where created_at >= p_from and created_at < p_to),
    'active_visitors', (select count(distinct visitor_id) from public.site_pageviews where created_at >= now() - interval '5 minutes'),
    'registered_users', (select count(*) from auth.users),
    'new_users', (select count(*) from auth.users where created_at >= p_from and created_at < p_to)
  ) into v_summary;

  with days as (
    select generate_series(
      (p_from at time zone 'UTC')::date::timestamp,
      ((p_to - interval '1 microsecond') at time zone 'UTC')::date::timestamp,
      interval '1 day'
    )::date as day
  ),
  daily_counts as (
    select
      days.day,
      count(pv.id)::bigint as views,
      count(distinct pv.visitor_id)::bigint as visitors
    from days
    left join public.site_pageviews pv
      on (pv.created_at at time zone 'UTC')::date = days.day
      and pv.created_at >= p_from
      and pv.created_at < p_to
    group by days.day
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('date', day, 'views', views, 'visitors', visitors) order by day),
    '[]'::jsonb
  ) into v_daily
  from daily_counts;

  select coalesce(
    jsonb_agg(jsonb_build_object('path', path, 'views', views) order by views desc),
    '[]'::jsonb
  ) into v_top_pages
  from (
    select path, count(*)::bigint as views
    from public.site_pageviews
    where created_at >= p_from and created_at < p_to
    group by path
    order by views desc
    limit 8
  ) pages;

  select coalesce(
    jsonb_agg(jsonb_build_object('source', source, 'views', views) order by views desc),
    '[]'::jsonb
  ) into v_referrers
  from (
    select
      coalesce(nullif(referrer_host, ''), 'مستقیم / نامشخص') as source,
      count(*)::bigint as views
    from public.site_pageviews
    where created_at >= p_from and created_at < p_to
    group by coalesce(nullif(referrer_host, ''), 'مستقیم / نامشخص')
    order by views desc
    limit 8
  ) sources;

  select coalesce(
    jsonb_agg(jsonb_build_object('device', device_type, 'views', views) order by views desc),
    '[]'::jsonb
  ) into v_devices
  from (
    select device_type, count(*)::bigint as views
    from public.site_pageviews
    where created_at >= p_from and created_at < p_to
    group by device_type
    order by views desc
  ) devices;

  return jsonb_build_object(
    'summary', v_summary,
    'daily', v_daily,
    'top_pages', v_top_pages,
    'referrers', v_referrers,
    'devices', v_devices
  );
end;
$function$;

revoke all on function private.get_site_analytics(timestamptz, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function private.get_site_analytics(timestamptz, timestamptz)
  to authenticated;

-- Wrapper is invoker-security; the private function validates the admin JWT itself.
create or replace function public.get_site_analytics(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.get_site_analytics(p_from, p_to);
$function$;

revoke all on function public.get_site_analytics(timestamptz, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.get_site_analytics(timestamptz, timestamptz)
  to authenticated;

-- Refresh PostgREST so the new RPCs are available immediately.
notify pgrst, 'reload schema';
