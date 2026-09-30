-- Card of the day only draws from cards everyone can relate to: cards marked
-- "Card of the day" in the spreadsheet, from the monthly deck or Somewhere in
-- Between. Life-season and body decks stay in the Library for people who
-- choose them.

alter table public.cards add column everyday boolean not null default false;

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

  -- 1. This month's deck, not used in the last 90 days.
  if v_deck is not null then
    select c.id into v_card
      from public.cards c
     where c.deck_id = v_deck and c.everyday and not c.archived
       and not exists (
         select 1 from public.card_of_day h
          where h.card_id = c.id and h.day > p_day - 90
       )
     order by random()
     limit 1;
  end if;

  -- 2. Somewhere in Between and past monthly decks, not used in the last 90 days.
  --    (Future monthly decks stay hidden until their month starts.)
  if v_card is null then
    select c.id into v_card
      from public.cards c
      join public.decks d on d.id = c.deck_id
     where c.everyday and not c.archived and d.status = 'published'
       and d.type in ('monthly', 'library')
       and (d.month is null or d.month <= p_day)
       and not exists (
         select 1 from public.card_of_day h
          where h.card_id = c.id and h.day > p_day - 90
       )
     order by random()
     limit 1;
  end if;

  -- 3. Any of those, even if used recently (only if the pool is ever smaller than 90).
  if v_card is null then
    select c.id into v_card
      from public.cards c
      join public.decks d on d.id = c.deck_id
     where c.everyday and not c.archived and d.status = 'published'
       and d.type in ('monthly', 'library')
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
