-- Shared card links (PRD §4.5): anyone with the link can see that one question,
-- signed in or not. Only the question, deck and category come back, never an
-- answer. An archived card says so, so the page can show "no longer available".

create or replace function public.shared_card(p_id uuid)
returns table (question text, deck_name text, category_name text, available boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.question,
         d.name,
         cat.name,
         (not c.archived and d.status = 'published')
    from public.cards c
    join public.decks d on d.id = c.deck_id
    join public.categories cat on cat.id = c.category_id
   where c.id = p_id;
$$;

revoke all on function public.shared_card(uuid) from public;
grant execute on function public.shared_card(uuid) to anon, authenticated;

-- Sign in with Apple: the account exists before the profile does, so the
-- profile is completed right after, with the same 18+ rule. This version also
-- records a shared link that led to the signup.
drop function if exists public.complete_profile(text, date, text, text, boolean, boolean, text);

create or replace function public.complete_profile(
  p_first_name text,
  p_birthday date,
  p_phone text,
  p_season_id text,
  p_email_consent boolean,
  p_text_consent boolean,
  p_timezone text,
  p_shared_card_id uuid default null
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
    id, first_name, birthday, phone, season_id, email_consent, text_consent, timezone, shared_card_id
  ) values (
    auth.uid(), trim(p_first_name), p_birthday, nullif(trim(p_phone), ''),
    p_season_id, coalesce(p_email_consent, false),
    coalesce(p_text_consent, false) and coalesce(length(trim(p_phone)), 0) > 0,
    p_timezone, p_shared_card_id
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.complete_profile(text, date, text, text, boolean, boolean, text, uuid) from public, anon;
grant execute on function public.complete_profile(text, date, text, text, boolean, boolean, text, uuid) to authenticated;
