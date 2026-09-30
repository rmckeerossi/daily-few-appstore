-- Event tracking and signup attribution.
--
-- Events say what happened and to which card or read, never what anyone wrote.
-- Signups and marketing opt-ins/outs are logged here in the database (a
-- trigger on profiles), so they're counted the same way for email signups,
-- Sign in with Apple, and changes made later in Profile.
--
-- Attribution: UTM tags and a referral code from the link someone arrived
-- through, saved on their profile once at signup and never changed after.
-- Everyone gets their own referral code, added to the card links they share,
-- so a signup can be credited to the link that brought them. The code is
-- random: it doesn't reveal who shared the link.

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

alter table public.activity drop constraint activity_event_check;
alter table public.activity add constraint activity_event_check check (event in (
  'app_open', 'card_drawn', 'card_skipped', 'card_answered', 'card_reflected',
  'card_shared', 'card_of_day_answered',
  'card_viewed', 'read_opened', 'signup_completed', 'marketing_opt_in', 'marketing_opt_out'
));

alter table public.activity
  add column read_id text references public.reads (id) on delete set null,
  add column channel text check (channel in ('email', 'text'));

-- The app logs its own events; signups and opt-ins only ever come from the
-- database trigger below, so they can't be sent (or faked) from a phone.
drop policy "People log their own activity" on public.activity;
create policy "People log their own activity"
  on public.activity for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and event not in ('signup_completed', 'marketing_opt_in', 'marketing_opt_out')
    and channel is null
  );

-- ---------------------------------------------------------------------------
-- Attribution on the profile
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column utm_source    text check (length(utm_source) <= 100),
  add column utm_medium    text check (length(utm_medium) <= 100),
  add column utm_campaign  text check (length(utm_campaign) <= 100),
  add column utm_content   text check (length(utm_content) <= 100),
  add column utm_term      text check (length(utm_term) <= 100),
  add column referral_tag  text check (length(referral_tag) <= 100),
  add column referral_code text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

update public.profiles
   set referral_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
 where referral_code is null;

alter table public.profiles alter column referral_code set not null;

-- Tags come from links anyone can craft: keep them short and plain.
create or replace function public.clean_tag(v text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(regexp_replace(lower(trim(coalesce(v, ''))), '[^a-z0-9._-]+', '-', 'g'), 100), '');
$$;

-- ---------------------------------------------------------------------------
-- Signup: both paths now also save attribution
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  attr jsonb := coalesce(meta -> 'attribution', '{}'::jsonb);
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
    email_consent, text_consent, timezone, shared_card_id,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, referral_tag
  ) values (
    new.id,
    trim(meta ->> 'first_name'),
    v_birthday,
    nullif(trim(meta ->> 'phone'), ''),
    nullif(meta ->> 'season_id', ''),
    coalesce((meta ->> 'email_consent')::boolean, false),
    coalesce((meta ->> 'text_consent')::boolean, false),
    nullif(meta ->> 'timezone', ''),
    nullif(meta ->> 'shared_card_id', '')::uuid,
    public.clean_tag(attr ->> 'utm_source'),
    public.clean_tag(attr ->> 'utm_medium'),
    public.clean_tag(attr ->> 'utm_campaign'),
    public.clean_tag(attr ->> 'utm_content'),
    public.clean_tag(attr ->> 'utm_term'),
    public.clean_tag(attr ->> 'ref')
  );
  return new;
end;
$$;

drop function if exists public.complete_profile(text, date, text, text, boolean, boolean, text, uuid);

create or replace function public.complete_profile(
  p_first_name text,
  p_birthday date,
  p_phone text,
  p_season_id text,
  p_email_consent boolean,
  p_text_consent boolean,
  p_timezone text,
  p_shared_card_id uuid default null,
  p_attribution jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attr jsonb := coalesce(p_attribution, '{}'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if p_birthday > (current_date - interval '18 years')::date then
    raise exception 'under_18' using errcode = 'P0001';
  end if;
  insert into public.profiles (
    id, first_name, birthday, phone, season_id, email_consent, text_consent, timezone, shared_card_id,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, referral_tag
  ) values (
    auth.uid(), trim(p_first_name), p_birthday, nullif(trim(p_phone), ''),
    p_season_id, coalesce(p_email_consent, false),
    coalesce(p_text_consent, false) and coalesce(length(trim(p_phone)), 0) > 0,
    p_timezone, p_shared_card_id,
    public.clean_tag(attr ->> 'utm_source'),
    public.clean_tag(attr ->> 'utm_medium'),
    public.clean_tag(attr ->> 'utm_campaign'),
    public.clean_tag(attr ->> 'utm_content'),
    public.clean_tag(attr ->> 'utm_term'),
    public.clean_tag(attr ->> 'ref')
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.complete_profile(text, date, text, text, boolean, boolean, text, uuid, jsonb) from public, anon;
grant execute on function public.complete_profile(text, date, text, text, boolean, boolean, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Signup completed and marketing opt-in/out, logged from the profile itself
-- ---------------------------------------------------------------------------

create or replace function public.profiles_log_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (user_id, event) values (new.id, 'signup_completed');
    if new.email_consent then
      insert into public.activity (user_id, event, channel) values (new.id, 'marketing_opt_in', 'email');
    end if;
    if new.text_consent then
      insert into public.activity (user_id, event, channel) values (new.id, 'marketing_opt_in', 'text');
    end if;
  else
    if new.email_consent is distinct from old.email_consent then
      insert into public.activity (user_id, event, channel)
      values (new.id, case when new.email_consent then 'marketing_opt_in' else 'marketing_opt_out' end, 'email');
    end if;
    if new.text_consent is distinct from old.text_consent then
      insert into public.activity (user_id, event, channel)
      values (new.id, case when new.text_consent then 'marketing_opt_in' else 'marketing_opt_out' end, 'text');
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.profiles_log_events() from public, anon, authenticated;

create trigger profiles_log_events
  after insert or update of email_consent, text_consent on public.profiles
  for each row execute function public.profiles_log_events();

-- ---------------------------------------------------------------------------
-- Admin reports
-- ---------------------------------------------------------------------------

-- The user export gains where each person came from (new columns at the end).
create or replace view admin.users as
select
  p.first_name,
  u.email,
  p.birthday,
  p.phone,
  s.name                        as season_of_life,
  p.created_at                  as signed_up_at,
  (p.shared_card_id is not null) as from_shared_link,
  p.email_consent               as email_opt_in,
  p.text_consent                as text_opt_in,
  p.reminder_enabled            as daily_reminder_on,
  p.utm_source,
  p.utm_medium,
  p.utm_campaign,
  p.utm_content,
  p.utm_term,
  p.referral_tag,
  referrer.first_name           as referred_by,
  p.referral_code
from public.profiles p
join auth.users u on u.id = p.id
left join public.seasons s on s.id = p.season_id
left join public.profiles referrer on referrer.referral_code = p.referral_tag
order by p.created_at desc;

-- Signups by where they came from.
create or replace view admin.signups_by_source as
select
  coalesce(p.utm_source, case when p.referral_tag is not null or p.shared_card_id is not null then 'shared link' else '(none)' end) as source,
  coalesce(p.utm_medium, '')   as medium,
  coalesce(p.utm_campaign, '') as campaign,
  count(*)                     as signups,
  count(*) filter (where p.email_consent) as email_opt_ins,
  min(p.created_at)            as first_signup,
  max(p.created_at)            as latest_signup
from public.profiles p
group by 1, 2, 3
order by signups desc;

-- Who's bringing people in: signups credited to each person's shared links.
create or replace view admin.referrals as
select
  referrer.first_name,
  referrer.referral_code,
  count(*) as signups_referred,
  max(p.created_at) as latest_referral
from public.profiles p
join public.profiles referrer on referrer.referral_code = p.referral_tag
group by referrer.id, referrer.first_name, referrer.referral_code
order by signups_referred desc;

-- Content: which cards are seen, which reads are opened, and opt-ins over time.
create or replace view admin.content_by_day as
select
  (a.created_at at time zone 'utc')::date as day,
  count(*) filter (where a.event = 'card_viewed')      as cards_viewed,
  count(*) filter (where a.event = 'read_opened')      as reads_opened,
  count(*) filter (where a.event = 'card_shared')      as cards_shared,
  count(*) filter (where a.event = 'signup_completed') as signups,
  count(*) filter (where a.event = 'marketing_opt_in' and a.channel = 'email')  as email_opt_ins,
  count(*) filter (where a.event = 'marketing_opt_out' and a.channel = 'email') as email_opt_outs,
  count(*) filter (where a.event = 'marketing_opt_in' and a.channel = 'text')   as text_opt_ins,
  count(*) filter (where a.event = 'marketing_opt_out' and a.channel = 'text')  as text_opt_outs
from public.activity a
group by 1
order by 1 desc;

create or replace view admin.read_stats as
select r.title, r.topic, count(a.id) as opened, count(distinct a.user_id) as people
from public.reads r
left join public.activity a on a.read_id = r.id and a.event = 'read_opened'
group by r.id, r.title, r.topic
order by opened desc;

revoke all on all tables in schema admin from public, anon, authenticated;
