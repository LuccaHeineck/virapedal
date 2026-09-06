DROP POLICY IF EXISTS "Confirm own presence or admin adds a guest" ON event_participants;

CREATE POLICY "Confirm own presence or admin adds a guest"
    ON event_participants FOR INSERT TO authenticated
    WITH CHECK (
        (user_id = auth.uid() AND can_view_event(event_id, auth.uid()))
        OR (
            guest_name IS NOT NULL AND added_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = event_id 
                  AND (e.created_by = auth.uid() OR is_group_admin(e.group_id, auth.uid()))
            )
        )
    );