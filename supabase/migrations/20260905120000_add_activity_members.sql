-- Activity-specific team composition for a date/team note.
-- Does not change the static TEAM_ROSTERS in application code.

alter table public.activity_notes
  add column if not exists members jsonb;

comment on column public.activity_notes.members is
  'Optional activity-only roster override for this date/team. Null means use the base team roster.';
