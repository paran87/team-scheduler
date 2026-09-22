-- Allow activity notes for people who are not on Team USEC, B, or A.
alter table public.activity_notes
  drop constraint if exists activity_notes_team_check;

alter table public.activity_notes
  add constraint activity_notes_team_check
  check (team in ('usec', 'b', 'a', 'special', 'guest'));
