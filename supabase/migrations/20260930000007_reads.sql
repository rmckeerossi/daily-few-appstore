-- Short reads: 1–2 minute plain-language explainers ("for understanding, not
-- medical advice"). Written in content/reads/*.md and loaded with
-- scripts/reads/build-seed.mjs, like the cards. Readable by signed-in members.

create table public.reads (
  id          text primary key,              -- slug, e.g. 'sleep-and-mood'
  title       text not null,
  summary     text,
  body        text not null,                 -- simple markdown: ## headings, - lists, **bold**
  minutes     smallint not null default 2,
  deck_ids    text[] not null default '{}',  -- shown as "Read first" on these decks
  patterns    text[] not null default '{}',  -- linked from these recap patterns
  card_deck   text references public.decks (id), -- "Pull a card about this"
  sort_order  int not null default 0,
  reviewed    boolean not null default false, -- checked by the clinical advisor
  status      public.content_status not null default 'published',
  updated_at  timestamptz not null default now()
);

create trigger reads_touch before update on public.reads
  for each row execute function public.touch_updated_at();

alter table public.reads enable row level security;

create policy "Published reads are visible to members"
  on public.reads for select to authenticated
  using (status = 'published');

grant select on public.reads to authenticated;
