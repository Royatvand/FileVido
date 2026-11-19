-- FCM device tokens for Android push notifications (app update alerts).
-- Tokens can be registered anonymously from the Android app; user_id is optional.
create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  platform text not null default 'android'
    check (platform in ('android')),
  device_key text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint fcm_tokens_token_not_empty check (char_length(trim(token)) > 0)
);

create unique index if not exists fcm_tokens_token_uidx
  on public.fcm_tokens (token);

create index if not exists fcm_tokens_last_seen_idx
  on public.fcm_tokens (last_seen_at desc);

alter table public.fcm_tokens enable row level security;

-- Android clients may register / refresh their own token without signing in.
drop policy if exists "Anyone can register FCM tokens" on public.fcm_tokens;
create policy "Anyone can register FCM tokens"
  on public.fcm_tokens for insert
  with check (platform = 'android');

drop policy if exists "Anyone can refresh their FCM token by token value" on public.fcm_tokens;
create policy "Anyone can refresh their FCM token by token value"
  on public.fcm_tokens for update
  using (true)
  with check (platform = 'android');

-- Authenticated users can bind their user_id to a token they already own.
drop policy if exists "Users can view their own FCM tokens" on public.fcm_tokens;
create policy "Users can view their own FCM tokens"
  on public.fcm_tokens for select to authenticated
  using ((select auth.uid()) = user_id);

-- Admins can list tokens (used by the notify endpoint after auth checks).
drop policy if exists "Admins can read all FCM tokens" on public.fcm_tokens;
create policy "Admins can read all FCM tokens"
  on public.fcm_tokens for select to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete FCM tokens" on public.fcm_tokens;
create policy "Admins can delete FCM tokens"
  on public.fcm_tokens for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant select, insert, update on public.fcm_tokens to anon, authenticated;
grant delete on public.fcm_tokens to authenticated;
