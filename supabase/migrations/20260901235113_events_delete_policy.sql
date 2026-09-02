-- events não tem nenhuma policy de DELETE (ver supabase/schema.sql) -- sem
-- ela, RLS bloqueia qualquer exclusão por padrão. Libera para o criador do
-- pedal ou admin do grupo, mesmo critério já usado na policy de UPDATE
-- ("Creator or admin edits event").
-- event_participants/event_photos/routes/event_changes referenciam
-- events(id) ON DELETE CASCADE, então excluir o pedal já limpa essas linhas.
drop policy if exists "Creator deletes event" on events;

create policy "Creator or admin deletes event"
    on events for delete to authenticated
    using (created_by = auth.uid() OR is_group_admin(group_id, auth.uid()));
