-- Safe upsert of data/activity-notes.json. Re-running does not create duplicates.
-- Run after public.activity_notes exists.

insert into public.activity_notes (
  id, date, team, location, activity, remarks, event, hidden, lat, lng, updated_at
) values
  (
    '2026-09-07__b',
    '2026-09-07',
    'b',
    'Zamboanga',
    '',
    '',
    null,
    false,
    6.9214,
    122.079,
    '2026-09-02T07:48:11.942Z'
  ),
  (
    '2026-09-08__b',
    '2026-09-08',
    'b',
    'Zamboanga',
    '',
    '',
    null,
    false,
    6.9214,
    122.079,
    '2026-09-02T07:51:32.238Z'
  ),
  (
    '2026-09-09__b',
    '2026-09-09',
    'b',
    'Zamboanga',
    '',
    '',
    null,
    false,
    6.9214,
    122.079,
    '2026-09-02T07:50:20.440Z'
  ),
  (
    '2026-09-14__b',
    '2026-09-14',
    'b',
    'Zamboanga',
    '',
    '',
    null,
    true,
    null,
    null,
    '2026-09-02T07:52:31.007Z'
  ),
  (
    '2026-09-15__b',
    '2026-09-15',
    'b',
    'Zamboanga',
    '',
    '',
    null,
    true,
    null,
    null,
    '2026-09-02T07:52:23.486Z'
  )
on conflict (id) do update set
  date = excluded.date,
  team = excluded.team,
  location = excluded.location,
  activity = excluded.activity,
  remarks = excluded.remarks,
  event = excluded.event,
  hidden = excluded.hidden,
  lat = excluded.lat,
  lng = excluded.lng,
  updated_at = excluded.updated_at;
