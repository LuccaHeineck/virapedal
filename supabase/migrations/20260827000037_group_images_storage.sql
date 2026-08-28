-- Private bucket for group cover images. Public (not just private) groups'
-- covers are still served through signed URLs, not public bucket access --
-- covers can show riders' faces or meeting locations, so the same privacy
-- guarantee should apply consistently regardless of the group's own
-- public/private setting.
--
-- Path convention: {group_id}/cover (no extension -- content type is set
-- explicitly on upload), so re-uploading on edit always targets the same
-- object and upsert:true just replaces it in place.

insert into storage.buckets (id, name, public)
values ('group-images', 'group-images', false)
on conflict (id) do nothing;

-- Readable by anyone who could see the group itself: any authenticated user
-- for a public group, or an active member for a private one. Reuses the
-- same is_group_member() helper the groups/group_members RLS policies
-- already rely on, rather than re-deriving the predicate.
create policy "Read group cover if group is visible"
on storage.objects for select
to authenticated
using (
  bucket_id = 'group-images'
  and exists (
    select 1 from public.groups g
    where g.id = ((storage.foldername(name))[1])::bigint
      and (g.privacy = 'public' or public.is_group_member(g.id, auth.uid()))
  )
);

-- Only that group's admins may upload a cover.
create policy "Admins upload group cover"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'group-images'
  and public.is_group_admin(((storage.foldername(name))[1])::bigint, auth.uid())
);

-- Storage upsert (used when an admin replaces the cover on edit) requires
-- UPDATE in addition to INSERT+SELECT -- INSERT alone lets new uploads
-- through but silently fails to replace an existing object.
create policy "Admins replace group cover"
on storage.objects for update
to authenticated
using (
  bucket_id = 'group-images'
  and public.is_group_admin(((storage.foldername(name))[1])::bigint, auth.uid())
)
with check (
  bucket_id = 'group-images'
  and public.is_group_admin(((storage.foldername(name))[1])::bigint, auth.uid())
);
