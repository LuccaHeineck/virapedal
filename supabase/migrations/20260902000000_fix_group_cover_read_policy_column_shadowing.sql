-- Fix: the "Read group cover if group is visible" policy referenced an
-- unqualified `name` inside a subquery that also has `public.groups g` in
-- scope. Because groups has a `name` column, `name` bound to `g.name` (the
-- group's display name) instead of `storage.objects.name` (the object path).
-- Postgres rewrote it as storage.foldername((g.name)::text), so
-- storage.foldername('Some Group Name') -> '{}' -> [1] is NULL -> g.id = NULL
-- -> the policy never matched.
--
-- Impact: covers were never readable, AND every upload failed. supabase-js's
-- .upload() issues INSERT ... ON CONFLICT DO UPDATE ... RETURNING *, and the
-- RETURNING clause requires the new row to also pass the SELECT policy --
-- which it never could -- so uploads died with "new row violates row-level
-- security policy" even though the INSERT WITH CHECK (is_group_admin) passed.
--
-- Fix: qualify the object column as objects.name so it can't be captured by
-- the groups alias.

drop policy "Read group cover if group is visible" on storage.objects;

create policy "Read group cover if group is visible"
on storage.objects for select
to authenticated
using (
  bucket_id = 'group-images'
  and exists (
    select 1 from public.groups g
    where g.id = ((storage.foldername(objects.name))[1])::bigint
      and (g.privacy = 'public' or public.is_group_member(g.id, auth.uid()))
  )
);
