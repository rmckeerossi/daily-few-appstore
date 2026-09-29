-- Entries: card-less things a person adds to their month from the + menu.
--   write  : free text (required), up to 3 optional photos
--   moment : 1 to 3 photos (required), optional short caption
-- Private to their owner, like answers.

create table public.entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('write', 'moment')),
  body         text,
  photo_paths  text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  entry_on     date not null,               -- the person's local date
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint write_has_text check (kind <> 'write' or coalesce(length(trim(body)), 0) > 0),
  constraint moment_has_photo check (kind <> 'moment' or cardinality(photo_paths) > 0)
);

create index entries_user_idx on public.entries (user_id, created_at desc);

create or replace function public.entries_guard()
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
    -- Editing never changes whose it is, what kind it is, or its date.
    new.user_id    := old.user_id;
    new.kind       := old.kind;
    new.entry_on   := old.entry_on;
    new.created_at := old.created_at;
  end if;
  if exists (select 1 from unnest(new.photo_paths) p where p not like new.user_id::text || '/%') then
    raise exception 'invalid_media_path';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger entries_guard
  before insert or update on public.entries
  for each row execute function public.entries_guard();

alter table public.entries enable row level security;

create policy "People read their own entries"
  on public.entries for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People add their own entries"
  on public.entries for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People edit their own entries"
  on public.entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People delete their own entries"
  on public.entries for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.entries to authenticated;
