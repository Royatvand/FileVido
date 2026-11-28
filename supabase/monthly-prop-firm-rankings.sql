-- Expand monthly prop-firm awards into a ranked top-10 leaderboard.
-- Existing rows are preserved and default to rank 1.

alter table public.monthly_prop_awards
  add column if not exists rank_position smallint not null default 1;

alter table public.monthly_prop_awards
  drop constraint if exists monthly_prop_awards_year_month_key;

alter table public.monthly_prop_awards
  drop constraint if exists monthly_prop_awards_rank_position_check;

alter table public.monthly_prop_awards
  add constraint monthly_prop_awards_rank_position_check
  check (rank_position between 1 and 10);

alter table public.monthly_prop_awards
  add constraint monthly_prop_awards_year_month_rank_key
  unique (jalali_year, jalali_month, rank_position);

alter table public.monthly_prop_awards
  add constraint monthly_prop_awards_year_month_firm_key
  unique (jalali_year, jalali_month, prop_firm_id);

create index if not exists monthly_prop_awards_leaderboard_idx
  on public.monthly_prop_awards (status, jalali_year desc, jalali_month desc, rank_position asc);
