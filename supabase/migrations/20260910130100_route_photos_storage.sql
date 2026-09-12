-- Private bucket for route photos. Unlike group covers (one object per
-- group, upserted in place), a route can have many photos, so the path
-- convention is {route_id}/{unique_id} -- each upload is a new object,
-- never replaced.
--
-- Visibility mirrors the route_photos table RLS: the route's recorder
-- always has access, others only if the route is linked to an event they
-- can view. Only the recorder may upload. Delete is keyed off Storage's
-- own `owner` column (set automatically to auth.uid() on upload), which
-- is what actually enforces "uploader deletes their own photo" at the
-- storage layer -- route_photos.uploaded_by alone doesn't reach here.
--
-- `name` below is always qualified as `objects.name`: routes has its own
-- `name` column, and an unqualified `name` inside `EXISTS (... FROM
-- routes r ...)` would resolve to `r.name` instead of storage.objects.name
-- -- the exact column-shadowing bug already hit (and fixed) for
-- group-images covers, see
-- 20260902000000_fix_group_cover_read_policy_column_shadowing.sql.

insert into storage.buckets (id, name, public)
values ('route-photos', 'route-photos', false)
on conflict (id) do nothing;

create policy "View photos of visible routes in storage"
on storage.objects for select
to authenticated
using (
  bucket_id = 'route-photos'
  and exists (
    select 1 from public.routes r
    where r.id = ((storage.foldername(objects.name))[1])::bigint
      and (r.recorded_by = auth.uid() or (r.event_id is not null and public.can_view_event(r.event_id, auth.uid())))
  )
);

create policy "Recorder uploads photos to their own route"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'route-photos'
  and exists (
    select 1 from public.routes r
    where r.id = ((storage.foldername(objects.name))[1])::bigint
      and r.recorded_by = auth.uid()
  )
);

create policy "Uploader deletes their own route photo object"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'route-photos'
  and owner = auth.uid()
);
