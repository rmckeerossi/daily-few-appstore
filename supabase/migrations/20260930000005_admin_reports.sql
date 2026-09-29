-- Admin reports (PRD §7): the product owner's view of signups and usage.
--
-- These live in a separate "admin" schema that the app's API never exposes and
-- app users can't reach. Open them in the Supabase dashboard (Table Editor →
-- schema "admin") and export any of them to CSV.
--
-- Counts and signup details only. Nothing here reads answer text, voice memos,
-- photos, entries or notes (PRD: the admin can never view reflections).

create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;

-- Users: signup info and marketing consent per channel (the user export).
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
  p.reminder_enabled            as daily_reminder_on
from public.profiles p
join auth.users u on u.id = p.id
left join public.seasons s on s.id = p.season_id
order by p.created_at desc;

-- Growth: new signups per day, and how many came from a shared card link.
create or replace view admin.signups_by_day as
select
  (p.created_at at time zone 'utc')::date as day,
  count(*)                                 as new_signups,
  count(*) filter (where p.shared_card_id is not null) as from_shared_links
from public.profiles p
group by 1
order by 1 desc;

-- Engagement: daily active people, cards answered, card of the day uptake.
create or replace view admin.activity_by_day as
with daily as (
  select (created_at at time zone 'utc')::date as day, event, user_id
  from public.activity
)
select
  day,
  count(distinct user_id) filter (where event = 'app_open')                           as daily_active_users,
  count(*) filter (where event in ('card_answered', 'card_reflected'))                as cards_answered,
  count(*) filter (where event = 'card_skipped')                                      as cards_skipped,
  count(*) filter (where event = 'card_shared')                                       as cards_shared,
  count(distinct user_id) filter (where event = 'card_of_day_answered')               as answered_card_of_day,
  round(
    100.0 * count(distinct user_id) filter (where event = 'card_of_day_answered')
      / nullif(count(distinct user_id) filter (where event = 'app_open'), 0),
    1
  )                                                                                   as card_of_day_percent
from daily
group by day
order by day desc;

-- Monthly active people.
create or replace view admin.active_by_month as
select
  date_trunc('month', created_at at time zone 'utc')::date as month,
  count(distinct user_id)                                  as monthly_active_users
from public.activity
where event = 'app_open'
group by 1
order by 1 desc;

-- Content: how each card does. Most answered, most skipped, most shared.
create or replace view admin.card_stats as
select
  d.name     as deck,
  cat.name   as category,
  c.question,
  count(*) filter (where a.event = 'card_drawn')                          as drawn,
  count(*) filter (where a.event in ('card_answered', 'card_reflected'))  as answered,
  count(*) filter (where a.event = 'card_skipped')                        as skipped,
  count(*) filter (where a.event = 'card_shared')                         as shared,
  c.archived
from public.cards c
join public.decks d on d.id = c.deck_id
join public.categories cat on cat.id = c.category_id
left join public.activity a on a.card_id = c.id
group by d.name, cat.name, c.question, c.archived
order by answered desc, drawn desc;

-- Content: which decks and categories get used.
create or replace view admin.deck_stats as
select
  d.name                                                                  as deck,
  d.type,
  d.status,
  (select count(*) from public.cards c where c.deck_id = d.id and not c.archived) as active_cards,
  count(*) filter (where a.event = 'card_drawn')                          as drawn,
  count(*) filter (where a.event in ('card_answered', 'card_reflected'))  as answered,
  count(*) filter (where a.event = 'card_skipped')                        as skipped
from public.decks d
left join public.activity a on a.deck_id = d.id
group by d.id, d.name, d.type, d.status
order by answered desc;

-- Planning: which months have a monthly deck, so gaps are visible ahead of time.
create or replace view admin.monthly_deck_calendar as
select
  m::date                                             as month,
  d.name                                              as monthly_deck,
  d.status,
  (select count(*) from public.cards c where c.deck_id = d.id and not c.archived) as active_cards
from generate_series(
  date_trunc('month', current_date),
  date_trunc('month', current_date) + interval '11 months',
  interval '1 month'
) as m
left join public.decks d on d.type = 'monthly' and d.month = m::date
order by 1;

-- Headline numbers on one row.
create or replace view admin.summary as
select
  (select count(*) from public.profiles)                                           as total_users,
  (select count(*) from public.profiles where shared_card_id is not null)          as signups_from_shared_links,
  (select count(*) from public.profiles where created_at > now() - interval '7 days')  as signups_last_7_days,
  (select count(*) from public.profiles where created_at > now() - interval '30 days') as signups_last_30_days,
  (select count(distinct user_id) from public.activity
     where event = 'app_open' and created_at > now() - interval '1 day')           as active_last_24_hours,
  (select count(distinct user_id) from public.activity
     where event = 'app_open' and created_at > now() - interval '30 days')         as active_last_30_days,
  (select count(*) from public.profiles where email_consent)                       as email_opt_ins,
  (select count(*) from public.profiles where text_consent)                        as text_opt_ins;

revoke all on all tables in schema admin from public, anon, authenticated;
