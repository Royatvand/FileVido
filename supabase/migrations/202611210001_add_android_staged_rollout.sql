-- Add staged Android release rollout and safe pause/rollback controls.
-- Existing published releases remain fully rolled out; future releases start at 10%.
alter table public.app_versions
  add column if not exists rollout_percentage smallint not null default 100,
  add column if not exists is_paused boolean not null default false,
  add column if not exists paused_at timestamptz;

alter table public.app_versions
  alter column rollout_percentage set default 10;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_versions_rollout_percentage_check'
      and conrelid = 'public.app_versions'::regclass
  ) then
    alter table public.app_versions
      add constraint app_versions_rollout_percentage_check
      check (rollout_percentage in (10, 25, 50, 100));
  end if;
end
$$;

create index if not exists app_versions_active_release_idx
  on public.app_versions (is_published, is_paused, version_code desc);

comment on column public.app_versions.rollout_percentage is
  'Stable per-device rollout stage: 10, 25, 50, or 100 percent.';
comment on column public.app_versions.is_paused is
  'When true, app update checks and push notifications skip this release.';
