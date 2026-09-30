-- Body check-in: a 10-second daily rating of energy, mood, sleep, stress and
-- cravings (1 to 5, each optional), plus an optional "period today".
--
-- Sensitive health data, so:
--   * private to its owner (Row Level Security), like answers;
--   * never included in the admin reports or any export;
--   * deleted with the account (cascade);
--   * never used for marketing (PRD; Apple guideline 5.1.3).

create table public.body_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null,                  -- the person's local date
  energy      smallint check (energy between 1 and 5),
  mood        smallint check (mood between 1 and 5),
  sleep       smallint check (sleep between 1 and 5),
  stress      smallint check (stress between 1 and 5),
  cravings    smallint check (cravings between 1 and 5),
  period      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, day)
);

create index body_checkins_user_day_idx on public.body_checkins (user_id, day desc);

create or replace function public.body_checkins_guard()
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
    new.day := old.day;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger body_checkins_guard
  before insert or update on public.body_checkins
  for each row execute function public.body_checkins_guard();

alter table public.body_checkins enable row level security;

create policy "People read their own check-ins"
  on public.body_checkins for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People add their own check-ins"
  on public.body_checkins for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People edit their own check-ins"
  on public.body_checkins for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People delete their own check-ins"
  on public.body_checkins for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.body_checkins to authenticated;
