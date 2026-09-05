-- Activity Report/MOM photos and optional roster column if an older project is missing it.

alter table public.activity_notes
  add column if not exists members jsonb;

alter table public.activity_notes
  add column if not exists report_images jsonb not null default '[]'::jsonb;

comment on column public.activity_notes.members is
  'Optional activity-only roster override for this date/team. Null means use the base team roster.';

comment on column public.activity_notes.report_images is
  'Activity Report/MOM photo metadata: [{ path, url, name }]. Files live in the activity-reports storage bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-reports',
  'activity-reports',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "activity_reports_public_read" on storage.objects;
create policy "activity_reports_public_read"
  on storage.objects for select
  using (bucket_id = 'activity-reports');
