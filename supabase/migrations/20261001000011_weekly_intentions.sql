-- Weekly digest: the one small intention someone carries into a week, and how
-- it went. Written in their own words, so private like answers: only they can
-- read it, never in admin reports, deleted with the account.
--
-- Discoveries (patterns from their check-ins) are worked out on the phone and
-- never stored here, because some come from period days, which stay on the phone.

create table public.weekly_intentions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null,                 -- the Monday of the week it's for
  body        text not null check (length(trim(body)) between 1 and 200),
  outcome     text check (outcome in ('mostly', 'a_little', 'not_this_week')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create or replace function public.weekly_intentions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.created_at := now();
  else
    new.user_id := old.user_id;
    new.week_start := old.week_start;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger weekly_intentions_guard
  before insert or update on public.weekly_intentions
  for each row execute function public.weekly_intentions_guard();

alter table public.weekly_intentions enable row level security;

create policy "People read their own intentions"
  on public.weekly_intentions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People add their own intentions"
  on public.weekly_intentions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People edit their own intentions"
  on public.weekly_intentions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People delete their own intentions"
  on public.weekly_intentions for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.weekly_intentions to authenticated;
