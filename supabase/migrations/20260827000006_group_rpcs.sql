-- Atomic group creation and join-request review.
--
-- Background: the "Create a group" INSERT policy on public.groups only checks
-- created_by = auth.uid() -- it does not add the creator to group_members.
-- But is_group_admin() (used by the groups UPDATE policy, group_members
-- policies, and the new storage policies below) checks group_members. So a
-- raw client-side insert into groups would leave the creator unable to do
-- anything with the group they just made -- especially a private one, where
-- they also could not self-insert into group_members afterwards (that
-- policy only allows self-insert into PUBLIC groups; anything else requires
-- already being an admin). create_group() closes that gap by performing both
-- inserts in a single transaction.

create or replace function public.create_group(
  p_name text,
  p_description text default null,
  p_image_path text default null,
  p_privacy text default 'public'
)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_group public.groups;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_privacy not in ('public', 'private') then
    raise exception 'invalid privacy: %', p_privacy;
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'name is required';
  end if;

  insert into public.groups (name, description, image_url, privacy, created_by)
  values (trim(p_name), p_description, p_image_path, p_privacy, v_uid)
  returning * into v_group;

  insert into public.group_members (group_id, user_id, role, joined_at)
  values (v_group.id, v_uid, 'admin', now());

  return v_group;
end;
$$;

-- Functions in public are callable by PUBLIC (anon + authenticated) by
-- default. This one is SECURITY DEFINER, so closing that off matters: only
-- signed-in users should be able to invoke it, and it enforces auth.uid()
-- internally rather than trusting a caller-supplied id.
revoke execute on function public.create_group(text, text, text, text) from public;
grant execute on function public.create_group(text, text, text, text) to authenticated;


-- Approve or reject a pending join request atomically. Unlike create_group,
-- this does NOT need SECURITY DEFINER: by the time a join request exists,
-- the group's admin already has their own admin group_members row (created
-- atomically above), so the calling admin's own RLS already grants UPDATE on
-- group_join_requests and INSERT on group_members for that group. Running as
-- SECURITY INVOKER means a non-admin caller gets exactly the same rejection
-- RLS would already give them on a direct update -- no bypass introduced.
create or replace function public.respond_to_join_request(
  p_request_id bigint,
  p_approve boolean
)
returns public.group_join_requests
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.group_join_requests;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_req
  from public.group_join_requests
  where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'join request % not found or already resolved', p_request_id;
  end if;

  update public.group_join_requests
  set status = case when p_approve then 'accepted' else 'rejected' end,
      reviewed_by = v_uid,
      reviewed_at = now()
  where id = p_request_id
  returning * into v_req;

  -- Under RLS, an UPDATE the caller isn't authorized for silently affects 0
  -- rows instead of raising -- this check is what actually enforces "only
  -- admins can review," not the SELECT above (which has no admin predicate).
  if not found then
    raise exception 'not authorized to review this join request';
  end if;

  if p_approve then
    -- Only one ACTIVE membership per (group_id, user_id) is enforced by a
    -- partial unique index (idx_group_members_active_unique). A rejoin after
    -- leaving is a new membership period, not a resurrected old row, so a
    -- fresh INSERT is correct; ON CONFLICT here only guards the edge case of
    -- approving a stale request for someone who is already an active member
    -- (left untouched rather than clobbering their existing role).
    insert into public.group_members (group_id, user_id, role, joined_at)
    values (v_req.group_id, v_req.requested_by, 'member', now())
    on conflict (group_id, user_id) where left_at is null
    do nothing;
  end if;

  return v_req;
end;
$$;

revoke execute on function public.respond_to_join_request(bigint, boolean) from public;
grant execute on function public.respond_to_join_request(bigint, boolean) to authenticated;
