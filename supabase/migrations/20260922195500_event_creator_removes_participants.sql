-- Somente quem criou o pedal pode excluir participantes. O próprio criador
-- não pode excluir a própria presença, mantendo o organizador vinculado ao evento.
DROP POLICY IF EXISTS "Event creator removes participants" ON event_participants;

CREATE POLICY "Event creator removes participants"
    ON event_participants FOR DELETE TO authenticated
    USING (
        user_id IS DISTINCT FROM auth.uid()
        AND EXISTS (
            SELECT 1
            FROM events e
            WHERE e.id = event_id
              AND e.created_by = auth.uid()
        )
    );
