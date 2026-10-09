-- Quem pode ver um pedal também pode abrir o perfil dos usuários que participam dele.
CREATE POLICY "View profiles of participants in visible events"
    ON public.users FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.event_participants ep
            WHERE ep.user_id = users.id
              AND ep.status <> 'cancelled'
              AND public.can_view_event(ep.event_id, auth.uid())
        )
    );
