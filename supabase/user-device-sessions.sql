-- Track the browser/device that owns each Supabase Auth session.
-- RLS ties each row to the authenticated user and the session_id claim in the JWT.
create table if not exists public.user_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null unique,
  device_key uuid not null,
  device_label text not null default 'دستگاه ناشناس',
  device_type text not null default 'desktop'
    check (device_type in ('desktop', 'mobile', 'tablet')),
  browser text not null default 'مرورگر نامشخص',
  operating_system text not null default 'سیستم‌عامل نامشخص',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists user_device_sessions_user_last_seen_idx
  on public.user_device_sessions (user_id, last_seen_at desc);

alter table public.user_device_sessions enable row level security;

drop policy if exists "Users can view their own device sessions" on public.user_device_sessions;
create policy "Users can view their own device sessions"
  on public.user_device_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can register their current device session" on public.user_device_sessions;
create policy "Users can register their current device session"
  on public.user_device_sessions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and session_id = ((select auth.jwt() ->> 'session_id')::uuid)
  );

drop policy if exists "Users can update their current device session" on public.user_device_sessions;
create policy "Users can update their current device session"
  on public.user_device_sessions for update to authenticated
  using (
    (select auth.uid()) = user_id
    and session_id = ((select auth.jwt() ->> 'session_id')::uuid)
  )
  with check (
    (select auth.uid()) = user_id
    and session_id = ((select auth.jwt() ->> 'session_id')::uuid)
  );

drop policy if exists "Users can remove their own device records" on public.user_device_sessions;
create policy "Users can remove their own device records"
  on public.user_device_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_device_sessions to authenticated;
