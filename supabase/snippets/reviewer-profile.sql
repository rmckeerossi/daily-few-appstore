-- Run once, after creating the App Review user in Authentication → Users
-- (email appreview@dailyfew.com, "Auto Confirm User" ticked).
-- Gives that account a profile so App Review lands straight in the app.
insert into public.profiles (id, first_name, birthday, season_id, email_consent, text_consent)
select id, 'Reviewer', date '1990-01-01', 'just-checking-in', false, false
  from auth.users
 where email = 'appreview@dailyfew.com'
on conflict (id) do nothing;
