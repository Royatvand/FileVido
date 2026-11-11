-- کاور پلی‌لیست‌ها (یک بار در Supabase → SQL Editor اجرا شود)
alter table public.playlists
  add column if not exists cover_url text not null default '';
