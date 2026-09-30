-- Demo data for the App Review account (appreview@dailyfew.com), so App Review
-- and the App Store screenshots show a lived-in month: six weeks of body
-- check-ins with real-looking patterns, and a handful of answers.
--
-- Run in the SQL Editor after reviewer-profile.sql. Safe to run again: it
-- clears the demo account's check-ins and answers first. Only ever touches
-- that one account.
--
-- Period days: these are saved on the server here, and the app moves them to
-- the phone (and clears them from the server) the first time the account is
-- opened, just like it does for everyone.

do $$
declare
  v_user uuid;
  d date;
  pre boolean;
  per boolean;
  rough boolean;
  h int;
begin
  select id into v_user from auth.users where email = 'appreview@dailyfew.com';
  if v_user is null then
    raise exception 'Create the appreview@dailyfew.com user first';
  end if;

  -- The guard triggers take the owner from the signed-in user; act as the demo account.
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  delete from public.body_checkins where user_id = v_user;
  delete from public.answers where user_id = v_user;

  for d in select generate_series(date '2026-08-19', date '2026-09-30', interval '1 day')::date loop
    h := abs(hashtext(d::text)) % 10;
    -- Skip a few days, like a real person would.
    continue when h = 0;
    per := d between date '2026-08-24' and date '2026-08-28' or d between date '2026-09-21' and date '2026-09-25';
    pre := d between date '2026-08-17' and date '2026-08-23' or d between date '2026-09-14' and date '2026-09-20';
    rough := h in (1, 4, 7) and not per;

    insert into public.body_checkins (day, energy, mood, sleep, stress, cravings, period, symptoms)
    values (
      d,
      case when pre then 2 when rough then 2 else 3 + (h % 3 = 0)::int + (h > 7)::int end,
      case when pre then 2 + (h > 6)::int when rough then 2 else 4 + (h > 7)::int end,
      case when rough then 1 + (h % 2) when pre then 3 else 4 + (h > 6)::int end,
      case when h in (2, 5) then 4 else 2 + (h > 5)::int end,
      case when pre then 4 + (h > 5)::int when h in (2, 5) then 4 else 1 + (h % 3 = 0)::int end,
      per,
      (case
        when pre and h > 4 then array['bloating', 'headache']
        when pre then array['bloating']
        when per and h < 5 then array['aches']
        when rough and h > 5 then array['brain-fog']
        when h = 5 then array['anxious']
        else array[]::text[]
      end)
    );
  end loop;

  -- A few answers across September, in the demo person's own words.
  insert into public.answers (card_id, body, answered_on)
  select c.id, a.body, a.day
    from (values
      ('What’s something from this summer you want to hold onto?',
       'Long dinners outside with nowhere to be. I want to keep one night a week like that, even when it’s cold.', date '2026-09-02'),
      ('What does a good ordinary day look like for you right now?',
       'Walk before work, a real lunch, phone away by ten. Nothing fancy. I feel better when the days have edges.', date '2026-09-05'),
      ('How does your energy change from Monday to Friday?',
       'I start strong and fade by Thursday. Friday afternoon I’m running on coffee and hope.', date '2026-09-09'),
      ('What’s a goal you care about that nobody else has to understand?',
       'Learning to swim properly. I’m 34 and I still can’t breathe on both sides.', date '2026-09-12'),
      ('Where do you feel it first when your schedule gets too full?',
       'My jaw. And I stop drinking water without noticing.', date '2026-09-16'),
      ('What are you proud of yourself for this month?',
       'Saying no to the extra project. It felt awful for a day and then it felt like air.', date '2026-09-24'),
      ('How are you, really, as this month ends?',
       'Tired but steadier than August. I think I’m finally noticing the pattern before my period instead of being surprised by it.', date '2026-09-29')
    ) as a(question, body, day)
    join public.cards c on c.question = a.question and not c.archived;
end $$;
