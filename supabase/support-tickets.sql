-- Support tickets for ChartMasters
-- Run in Supabase Dashboard -> SQL Editor.
-- Safe to re-run: policies and triggers are recreated.

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

create index if not exists support_ticket_messages_sender_idx
  on public.support_ticket_messages (sender_id);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- Trigger functions live outside the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Remove the previous public trigger functions when upgrading this script.
drop trigger if exists support_ticket_owner_before_insert on public.support_tickets;
drop trigger if exists support_ticket_message_after_insert on public.support_ticket_messages;
drop function if exists public.set_support_ticket_owner();
drop function if exists public.touch_support_ticket_on_message();

-- Set ownership from the authenticated session, never from client-supplied fields.
-- This function does not need SECURITY DEFINER.
create or replace function private.set_support_ticket_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required to create a support ticket';
  end if;

  new.user_id := (select auth.uid());
  new.user_email := coalesce((select auth.jwt() ->> 'email'), '');
  new.user_name := coalesce(
    (select auth.jwt() -> 'user_metadata' ->> 'full_name'),
    (select auth.jwt() -> 'user_metadata' ->> 'name'),
    ''
  );

  return new;
end;
$$;

create trigger support_ticket_owner_before_insert
  before insert on public.support_tickets
  for each row execute function private.set_support_ticket_owner();

-- A message must already have passed the INSERT RLS policy.
-- SECURITY DEFINER is needed here because ordinary users cannot update ticket
-- rows directly. Keep this function in the private schema and validate the
-- caller again before changing the parent ticket.
create or replace function private.touch_support_ticket_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or new.sender_id is distinct from (select auth.uid()) then
    raise exception 'Invalid support ticket message sender';
  end if;

  if new.sender_role = 'admin'
     and ((select auth.jwt()) -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Only admins can send admin replies';
  end if;

  update public.support_tickets
  set updated_at = now(),
      status = case
        when new.sender_role = 'admin' then 'answered'
        else 'open'
      end
  where id = new.ticket_id
    and (
      (
        new.sender_role = 'user'
        and user_id = (select auth.uid())
        and status <> 'closed'
      )
      or (
        new.sender_role = 'admin'
        and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      )
    );

  if not found then
    raise exception 'You are not allowed to update this support ticket';
  end if;

  return new;
end;
$$;

create trigger support_ticket_message_after_insert
  after insert on public.support_ticket_messages
  for each row execute function private.touch_support_ticket_on_message();

-- Trigger functions are not intended to be callable through the Data API.
revoke all on function private.set_support_ticket_owner() from public, anon, authenticated;
revoke all on function private.touch_support_ticket_on_message() from public, anon, authenticated;

-- Users can read only their own tickets; admins are identified only by trusted app_metadata.
drop policy if exists "Users and admins read support tickets" on public.support_tickets;
create policy "Users and admins read support tickets"
  on public.support_tickets for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Authenticated users create own support tickets" on public.support_tickets;
create policy "Authenticated users create own support tickets"
  on public.support_tickets for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Only admins can directly update ticket fields (status and meeting_url).
drop policy if exists "Admins update support tickets" on public.support_tickets;
create policy "Admins update support tickets"
  on public.support_tickets for update
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

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
          or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
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
          select 1
          from public.support_tickets t
          where t.id = ticket_id
            and t.user_id = (select auth.uid())
            and t.status <> 'closed'
        )
      )
      or (
        sender_role = 'admin'
        and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
        and exists (
          select 1
          from public.support_tickets t
          where t.id = ticket_id
        )
      )
    )
  );

-- Explicit Data API privileges; RLS above still controls row-level access.
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_ticket_messages to authenticated;
