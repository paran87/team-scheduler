-- Team Scheduler mutable activity notes.
-- Static printed assignments stay in lib/schedule-data.ts.
-- Dates are stored as YYYY-MM-DD text so 2026-09-07 never shifts a day in UTC.

create table if not exists public.activity_notes (
  id text primary key,
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  team text not null check (team in ('usec', 'b', 'a', 'special')),
  location text not null default '',
  activity text not null default '',
  remarks text not null default '',
  event text,
  hidden boolean not null default false,
  lat double precision,
  lng double precision,
  members jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists activity_notes_date_team_idx
  on public.activity_notes (date, team);

create or replace function public.set_activity_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists activity_notes_set_updated_at on public.activity_notes;
create trigger activity_notes_set_updated_at
  before update on public.activity_notes
  for each row
  execute function public.set_activity_notes_updated_at();

alter table public.activity_notes enable row level security;

drop policy if exists "activity_notes_select" on public.activity_notes;
drop policy if exists "activity_notes_insert" on public.activity_notes;
drop policy if exists "activity_notes_update" on public.activity_notes;
drop policy if exists "activity_notes_delete" on public.activity_notes;

-- Public dashboard reads with the publishable key.
create policy "activity_notes_select"
  on public.activity_notes for select
  using (true);

-- Writes go through /api/activity-notes on the server using SUPABASE_SERVICE_ROLE_KEY.
-- The service role bypasses RLS; anon/authenticated clients cannot mutate rows directly.
revoke all on table public.activity_notes from anon, authenticated;
grant select on table public.activity_notes to anon, authenticated;
grant all on table public.activity_notes to service_role;
