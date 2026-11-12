-- پروفایل کاربران (ورود با شماره موبایل)
-- یک بار در Supabase → SQL Editor اجرا شود.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- هر کاربر فقط پروفایل خودش را می‌بیند و فقط نام خودش را ویرایش می‌کند
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ادمین همه پروفایل‌ها را می‌بیند
drop policy if exists "Admins read profiles" on public.profiles;
create policy "Admins read profiles" on public.profiles
  for select to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- با ساخته شدن هر کاربر جدید، پروفایلش هم ساخته می‌شود
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
