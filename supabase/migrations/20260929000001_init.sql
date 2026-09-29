-- Daily Few: initial schema.
--
-- Content (seasons, decks, categories, cards) is the shared question library,
-- loaded from Daily_Few_Card_Library.xlsx by scripts/cards/build-seed.mjs.
-- Everything a person writes (profile, answers, monthly notes, media) is private
-- to them: Row Level Security only ever lets the owner read or write their rows.
--
-- The project has "Automatically expose new tables" switched off, so every
-- table below is reachable from the app only through the explicit grants here.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Content library
-- ---------------------------------------------------------------------------

create table public.seasons (
  id          text primary key,              -- slug, e.g. 'starting-over'
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  archived    boolean not null default false
);

create type public.deck_type as enum ('library', 'monthly', 'life_season', 'body');
create type public.content_status as enum ('draft', 'published', 'archived');

create table public.decks (
  id          text primary key,              -- slug, e.g. 'somewhere-in-between'
  name        text not null,
  description text,
  type        public.deck_type not null,
  month       date,                          -- first day of the month (monthly decks only)
  season_id   text references public.seasons (id),
  status      public.content_status not null default 'draft',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint monthly_has_month check ((type = 'monthly') = (month is not null)),
  constraint month_is_first_day check (month is null or extract(day from month) = 1),
  constraint only_life_season_links_season check (season_id is null or type = 'life_season')
);

-- One published monthly deck per month, one published deck per season.
create unique index decks_one_monthly_per_month
  on public.decks (month) where type = 'monthly' and status = 'published';
create unique index decks_one_per_season
  on public.decks (season_id) where type = 'life_season' and status = 'published';

create trigger decks_touch before update on public.decks
  for each row execute function public.touch_updated_at();

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  deck_id     text not null references public.decks (id),
  name        text not null,
  sort_order  int  not null default 0,
  archived    boolean not null default false,
  unique (deck_id, name)
);

create table public.cards (
  id          uuid primary key default gen_random_uuid(),
  deck_id     text not null references public.decks (id),
  category_id uuid not null references public.categories (id),
  question    text not null,
  sort_order  int  not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index cards_category_idx on public.cards (category_id) where not archived;
create index cards_deck_idx on public.cards (deck_id) where not archived;

create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  first_name        text not null check (length(trim(first_name)) between 1 and 60),
  birthday          date not null,
  phone             text,
  season_id         text references public.seasons (id),
  email_consent     boolean not null default false,
  text_consent      boolean not null default false,
  reminder_enabled  boolean not null default false,
  reminder_time     time,
  timezone          text,
  shared_card_id    uuid references public.cards (id), -- set when they signed up from a shared link
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint adult check (birthday <= (current_date - interval '18 years')::date),
  constraint text_consent_needs_phone check (not text_consent or coalesce(length(trim(phone)), 0) > 0)
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Signup sends first name, birthday, phone, season and consent as user
-- metadata with the email code request. The profile is created in the same
-- transaction as the account, and an under-18 birthday aborts both, so no
-- account is ever created for a minor (PRD §6). An account created without a
-- birthday (e.g. Sign in with Apple) gets its profile later via complete_profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_birthday date;
begin
  if nullif(meta ->> 'birthday', '') is null then
    return new;
  end if;

  v_birthday := (meta ->> 'birthday')::date;
  if v_birthday > (current_date - interval '18 years')::date then
    raise exception 'under_18' using errcode = 'P0001';
  end if;

  insert into public.profiles (
    id, first_name, birthday, phone, season_id,
    email_consent, text_consent, timezone, shared_card_id
  ) values (
    new.id,
    trim(meta ->> 'first_name'),
    v_birthday,
    nullif(trim(meta ->> 'phone'), ''),
    nullif(meta ->> 'season_id', ''),
    coalesce((meta ->> 'email_consent')::boolean, false),
    coalesce((meta ->> 'text_consent')::boolean, false),
    nullif(meta ->> 'timezone', ''),
    nullif(meta ->> 'shared_card_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- For accounts created without signup details (Sign in with Apple).
create or replace function public.complete_profile(
  p_first_name text,
  p_birthday date,
  p_phone text,
  p_season_id text,
  p_email_consent boolean,
  p_text_consent boolean,
  p_timezone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if p_birthday > (current_date - interval '18 years')::date then
    raise exception 'under_18' using errcode = 'P0001';
  end if;
  insert into public.profiles (
    id, first_name, birthday, phone, season_id, email_consent, text_consent, timezone
  ) values (
    auth.uid(), trim(p_first_name), p_birthday, nullif(trim(p_phone), ''),
    p_season_id, coalesce(p_email_consent, false), coalesce(p_text_consent, false), p_timezone
  )
  on conflict (id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Answers and monthly notes
-- ---------------------------------------------------------------------------

create table public.answers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id        uuid not null references public.cards (id),
  -- Snapshot of the wording when answered (PRD §6). Filled by a trigger from
  -- the card, never trusted from the app.
  question_text  text not null,
  deck_name      text not null,
  category_name  text not null,
  body           text,
  reflected      boolean not null default false,
  voice_path     text,
  voice_seconds  int check (voice_seconds between 0 and 300),
  photo_paths    text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  answered_on    date not null,              -- the person's local date
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint has_content check (
    reflected
    or coalesce(length(trim(body)), 0) > 0
    or voice_path is not null
    or cardinality(photo_paths) > 0
  )
);

create index answers_user_idx on public.answers (user_id, created_at desc);
create index answers_user_card_idx on public.answers (user_id, card_id);

create or replace function public.answers_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    select c.question, d.name, cat.name
      into new.question_text, new.deck_name, new.category_name
      from public.cards c
      join public.decks d on d.id = c.deck_id
      join public.categories cat on cat.id = c.category_id
     where c.id = new.card_id;
    if not found then
      raise exception 'card_not_found';
    end if;
    new.created_at := now();
  else
    -- Editing never changes whose it is, which card, the wording or the date.
    new.user_id       := old.user_id;
    new.card_id       := old.card_id;
    new.question_text := old.question_text;
    new.deck_name     := old.deck_name;
    new.category_name := old.category_name;
    new.answered_on   := old.answered_on;
    new.created_at    := old.created_at;
  end if;

  -- Media must live in the owner's own storage folder.
  if new.voice_path is not null and new.voice_path not like new.user_id::text || '/%' then
    raise exception 'invalid_media_path';
  end if;
  if exists (select 1 from unnest(new.photo_paths) p where p not like new.user_id::text || '/%') then
    raise exception 'invalid_media_path';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger answers_guard
  before insert or update on public.answers
  for each row execute function public.answers_guard();

create table public.monthly_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month        date not null check (extract(day from month) = 1),
  body         text,
  photo_paths  text[] not null default '{}' check (cardinality(photo_paths) <= 6),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, month)
);

create or replace function public.monthly_notes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
  else
    new.user_id := old.user_id;
    new.month := old.month;
  end if;
  if exists (select 1 from unnest(new.photo_paths) p where p not like new.user_id::text || '/%') then
    raise exception 'invalid_media_path';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger monthly_notes_guard
  before insert or update on public.monthly_notes
  for each row execute function public.monthly_notes_guard();

-- ---------------------------------------------------------------------------
-- Card of the day: same card for everyone on a given date, from the current
-- monthly deck, never repeated within 90 days, library fallback (PRD §4.4).
-- The app passes its own local date, so the card rolls over at local midnight.
-- ---------------------------------------------------------------------------

create table public.card_of_day (
  day      date primary key,
  card_id  uuid not null references public.cards (id)
);

create or replace function public.card_of_the_day(p_day date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card uuid;
  v_deck text;
begin
  -- Every timezone on Earth is within a day of UTC.
  if p_day is null or p_day not between current_date - 1 and current_date + 1 then
    raise exception 'invalid_day';
  end if;

  select card_id into v_card from public.card_of_day where day = p_day;
  if v_card is not null then
    return v_card;
  end if;

  select id into v_deck
    from public.decks
   where type = 'monthly' and status = 'published'
     and month = date_trunc('month', p_day)::date;

  -- 1. Current monthly deck, not used in the last 90 days.
  -- 2. Whole library, not used in the last 90 days.
  -- 3. Anything active (only if the library is ever smaller than 90 cards).
  select c.id into v_card
    from public.cards c
    join public.decks d on d.id = c.deck_id
   where not c.archived and d.status = 'published'
     and (v_deck is null or c.deck_id = v_deck)
     and not exists (
       select 1 from public.card_of_day h
        where h.card_id = c.id and h.day > p_day - 90
     )
   order by random()
   limit 1;

  -- (Future monthly decks stay hidden until their month starts.)
  if v_card is null then
    select c.id into v_card
      from public.cards c
      join public.decks d on d.id = c.deck_id
     where not c.archived and d.status = 'published'
       and (d.month is null or d.month <= p_day)
       and not exists (
         select 1 from public.card_of_day h
          where h.card_id = c.id and h.day > p_day - 90
       )
     order by random()
     limit 1;
  end if;

  if v_card is null then
    select c.id into v_card
      from public.cards c
      join public.decks d on d.id = c.deck_id
     where not c.archived and d.status = 'published'
       and (d.month is null or d.month <= p_day)
     order by random()
     limit 1;
  end if;

  if v_card is null then
    return null;
  end if;

  insert into public.card_of_day (day, card_id) values (p_day, v_card)
    on conflict (day) do nothing;
  select card_id into v_card from public.card_of_day where day = p_day;
  return v_card;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity (for the admin's anonymous metrics). Write-only from the app.
-- Rows survive account deletion with the person unlinked (PRD §4.10).
-- ---------------------------------------------------------------------------

create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid default auth.uid() references auth.users (id) on delete set null,
  event       text not null check (event in (
                'app_open', 'card_drawn', 'card_skipped', 'card_answered',
                'card_reflected', 'card_shared', 'card_of_day_answered'
              )),
  card_id     uuid references public.cards (id),
  deck_id     text references public.decks (id),
  created_at  timestamptz not null default now()
);

create index activity_event_time_idx on public.activity (event, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.seasons       enable row level security;
alter table public.decks         enable row level security;
alter table public.categories    enable row level security;
alter table public.cards         enable row level security;
alter table public.profiles      enable row level security;
alter table public.answers       enable row level security;
alter table public.monthly_notes enable row level security;
alter table public.card_of_day   enable row level security;
alter table public.activity      enable row level security;

-- Seasons are shown during signup, before there's an account.
create policy "Active seasons are public"
  on public.seasons for select to anon, authenticated
  using (not archived);

create policy "Published decks are visible to members"
  on public.decks for select to authenticated
  using (status = 'published');

create policy "Active categories of published decks are visible to members"
  on public.categories for select to authenticated
  using (
    not archived
    and exists (select 1 from public.decks d where d.id = deck_id and d.status = 'published')
  );

create policy "Active cards of published decks are visible to members"
  on public.cards for select to authenticated
  using (
    not archived
    and exists (select 1 from public.decks d where d.id = deck_id and d.status = 'published')
  );

create policy "Card of the day is visible to members"
  on public.card_of_day for select to authenticated
  using (true);

create policy "People read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "People update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "People read their own answers"
  on public.answers for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People add their own answers"
  on public.answers for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People edit their own answers"
  on public.answers for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People delete their own answers"
  on public.answers for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "People read their own notes"
  on public.monthly_notes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People add their own notes"
  on public.monthly_notes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People edit their own notes"
  on public.monthly_notes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People delete their own notes"
  on public.monthly_notes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "People log their own activity"
  on public.activity for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (tables are not exposed automatically in this project)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.seasons to anon, authenticated;
grant select on public.decks, public.categories, public.cards, public.card_of_day to authenticated;
grant select on public.profiles to authenticated;
-- Birthday and signup attribution are fixed once set.
grant update (first_name, phone, season_id, email_consent, text_consent,
              reminder_enabled, reminder_time, timezone)
  on public.profiles to authenticated;
grant select, insert, update, delete on public.answers, public.monthly_notes to authenticated;
grant insert on public.activity to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.card_of_the_day(date) from public, anon;
grant execute on function public.card_of_the_day(date) to authenticated;
revoke all on function public.complete_profile(text, date, text, text, boolean, boolean, text) from public, anon;
grant execute on function public.complete_profile(text, date, text, text, boolean, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage for voice memos and photos: {user_id}/... only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'answer-media', 'answer-media', false, 26214400,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp',
        'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg']
)
on conflict (id) do nothing;

create policy "People read their own media"
  on storage.objects for select to authenticated
  using (bucket_id = 'answer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People upload their own media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'answer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People replace their own media"
  on storage.objects for update to authenticated
  using (bucket_id = 'answer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People delete their own media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'answer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
