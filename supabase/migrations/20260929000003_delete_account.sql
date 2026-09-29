-- Permanent account deletion (PRD §4.10), required by the App Store too.
--
-- Deleting the auth user removes everything they created in one step:
-- profiles, answers, entries and monthly notes all cascade from auth.users.
-- Activity rows stay for the anonymous metrics, with the person unlinked
-- (on delete set null). The app removes their photo and voice files from
-- storage first, then calls this.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
