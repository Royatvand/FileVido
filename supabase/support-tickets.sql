-- Support tickets for ChartMasters
-- Run once in Supabase Dashboard -> SQL Editor.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  user_name text not null default '',
  subject text not null check (char_length(trim(subject)) between 3 and 140),
  category text not null default 'general',
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  meeting_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  message text not null check (char_length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_updated_idx
  on public.support_tickets (user_id, updated_at desc);
create index if not exists support_ticket_messages_ticket_created_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- The owner is always taken from the authenticated JWT, never from client input.
create or replace function public.set_support_ticket_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.user_email := coalesce(auth.jwt() ->> 'email', '');
  new.user_name := coalesce(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name',
    ''
  );
  return new;
end;
$$;

drop trigger if exists support_ticket_owner_before_insert on public.support_tickets;
create trigger support_ticket_owner_before_insert
  before insert on public.support_tickets
  for each row execute function public.set_support_ticket_owner();

-- Every new message updates the ticket's activity and status.
create or replace function public.touch_support_ticket_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets
  set updated_at = now(),
      status = case when new.sender_role = 'admin' then 'answered' else 'open' end
  where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists support_ticket_message_after_insert on public.support_ticket_messages;
create trigger support_ticket_message_after_insert
  after insert on public.support_ticket_messages
  for each row execute function public.touch_support_ticket_on_message();

drop policy if exists "Users and admins read support tickets" on public.support_tickets;
create policy "Users and admins read support tickets"
  on public.support_tickets for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Authenticated users create own support tickets" on public.support_tickets;
create policy "Authenticated users create own support tickets"
  on public.support_tickets for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Admins update support tickets" on public.support_tickets;
create policy "Admins update support tickets"
  on public.support_tickets for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Ticket owners and admins read messages" on public.support_ticket_messages;
create policy "Ticket owners and admins read messages"
  on public.support_ticket_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = ticket_id
        and (
          t.user_id = (select auth.uid())
          or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    )
  );

drop policy if exists "Users and admins add valid ticket messages" on public.support_ticket_messages;
create policy "Users and admins add valid ticket messages"
  on public.support_ticket_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (
        sender_role = 'user'
        and exists (
          select 1 from public.support_tickets t
          where t.id = ticket_id and t.user_id = (select auth.uid())
        )
      )
      or (
        sender_role = 'admin'
        and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        and exists (
          select 1 from public.support_tickets t where t.id = ticket_id
        )
      )
    )
  );

grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_ticket_messages to authenticated;
