create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_videos (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (playlist_id, video_id)
);

create index if not exists playlist_videos_video_id_idx on public.playlist_videos(video_id);

alter table public.playlists enable row level security;
alter table public.playlist_videos enable row level security;

create policy "Admins manage playlists"
on public.playlists for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Public can read published playlists"
on public.playlists for select to anon, authenticated
using (status = 'published' or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins manage playlist videos"
on public.playlist_videos for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Public can read published playlist videos"
on public.playlist_videos for select to anon, authenticated
using (
  exists (
    select 1
    from public.playlists p
    join public.videos v on v.id = playlist_videos.video_id
    where p.id = playlist_videos.playlist_id
      and p.status = 'published'
      and v.status = 'published'
  )
);

grant select on public.playlists, public.playlist_videos to anon, authenticated;
grant insert, update, delete on public.playlists, public.playlist_videos to authenticated;
