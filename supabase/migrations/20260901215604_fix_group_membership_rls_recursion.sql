-- is_group_member() and is_group_admin() are used inside RLS policies on
-- public.group_members itself (its own SELECT/UPDATE policies call them).
-- Without SECURITY DEFINER, their internal "SELECT ... FROM group_members"
-- runs as SECURITY INVOKER, which re-applies group_members' own RLS -- a
-- self-referencing check on the same table it's guarding. That recursive
-- check is unreliable for a row still inside the same INSERT statement: a
-- plain INSERT into group_members succeeds, but INSERT ... RETURNING (what
-- supabase-js sends when you chain .select() after .insert(), e.g.
-- useJoin.ts's joinPublicGroup) fails with "new row violates row-level
-- security policy for table group_members", because the implicit SELECT
-- needed for RETURNING can't confirm the brand-new row through the
-- recursive function call, even though a separate SELECT right after
-- would.
--
-- Marking both SECURITY DEFINER makes their internal query run with the
-- function owner's privileges, bypassing group_members RLS for that lookup
-- only -- the same pattern already used by create_group() in
-- 20260827000006_group_rpcs.sql. This does not widen what callers can see;
-- the functions still only return a boolean derived from auth.uid()'s own
-- membership.
alter function public.is_group_member(bigint, uuid) security definer set search_path = public, pg_temp;
alter function public.is_group_admin(bigint, uuid) security definer set search_path = public, pg_temp;

-- SECURITY DEFINER alone was not enough: it fixes *permission* (the
-- function's internal query no longer gets RLS-filtered), but the real
-- failure is *visibility*. is_group_member() re-queries group_members from
-- scratch to find a row matching (group_id, user_id) -- and within the same
-- INSERT ... RETURNING command, that fresh sub-scan is not guaranteed to see
-- the row this very statement just inserted moments earlier. A plain INSERT
-- (no RETURNING) never hits this path, since it doesn't need to re-look-up
-- the row it just created -- confirmed by testing: INSERT alone succeeds,
-- INSERT ... RETURNING on the exact same values fails with "new row
-- violates row-level security policy", even after the SECURITY DEFINER
-- change above.
--
-- The fix is to let a user see their own group_members row via a direct
-- column comparison against the row's own data (no subquery, no lookup --
-- same reason the INSERT policy's `user_id = auth.uid()` clause never had
-- this problem), and fall back to is_group_member() only for rows that
-- belong to someone else in a group you're also in.
alter policy "View membership of your groups"
on public.group_members
to authenticated
using (
  user_id = auth.uid()
  or is_group_member(group_id, auth.uid())
);
