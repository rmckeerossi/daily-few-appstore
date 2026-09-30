-- Body check-in symptoms: optional chips, private like the rest of the check-in.
-- Period days no longer come to the server at all: the app keeps them on the
-- phone. It copies any already saved here to the phone and then clears them;
-- the column itself is dropped in a later migration once testers have updated.

alter table public.body_checkins
  add column symptoms text[] not null default '{}'
  check (symptoms <@ array['headache', 'bloating', 'aches', 'brain-fog', 'anxious', 'hot-flashes', 'skin']::text[]);

comment on column public.body_checkins.period is
  'Deprecated: period days are kept on the phone only. Always false for new check-ins.';
