-- User learning activity tables for ChartMasters.
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_favorites_user_video_unique unique (user_id, video_id)
);

create table if not exists public.user_video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  last_watched_at timestamptz not null default now(),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_video_progress_user_video_unique unique (user_id, video_id),
  constraint user_video_progress_completed_at_check check (
    (is_completed = false and completed_at is null)
    or (is_completed = true and completed_at is not null)
  )
);

create index if not exists user_favorites_user_created_idx on public.user_favorites (user_id, created_at desc);
create index if not exists user_video_progress_user_watched_idx on public.user_video_progress (user_id, last_watched_at desc);

alter table public.user_favorites enable row level security;
alter table public.user_video_progress enable row level security;

drop policy if exists "Users read own favorites" on public.user_favorites;
create policy "Users read own favorites" on public.user_favorites for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users add own favorites" on public.user_favorites;
create policy "Users add own favorites" on public.user_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove own favorites" on public.user_favorites;
create policy "Users remove own favorites" on public.user_favorites for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users read own video progress" on public.user_video_progress;
create policy "Users read own video progress" on public.user_video_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create own video progress" on public.user_video_progress;
create policy "Users create own video progress" on public.user_video_progress for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own video progress" on public.user_video_progress;
create policy "Users update own video progress" on public.user_video_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, delete on public.user_favorites to authenticated;
grant select, insert, update on public.user_video_progress to authenticated;

create index if not exists user_favorites_video_id_idx on public.user_favorites (video_id);
create index if not exists user_video_progress_video_id_idx on public.user_video_progress (video_id);
