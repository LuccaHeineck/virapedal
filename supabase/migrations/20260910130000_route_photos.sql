-- =========================================================
-- route_photos — photos attached to a route recording
-- Mirrors event_photos, but keyed to routes instead of events.
-- Lets solo rides (routes.event_id IS NULL) have photos too,
-- which event_photos can't support since its event_id is NOT NULL.
-- =========================================================

CREATE TABLE route_photos (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    route_id     BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    uploaded_by  UUID NOT NULL REFERENCES users(id),
    image_url    VARCHAR(500) NOT NULL,  -- object path in private Storage bucket
    caption      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_photos_route ON route_photos(route_id);
CREATE INDEX idx_route_photos_uploaded_by ON route_photos(uploaded_by);

ALTER TABLE route_photos ENABLE ROW LEVEL SECURITY;

-- --- route_photos ---

-- Same visibility as the route itself: recorder always sees their own
-- route's photos; others only if the route is linked to a viewable event.
CREATE POLICY "View photos of visible routes"
    ON route_photos FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM routes r
            WHERE r.id = route_id
              AND (r.recorded_by = auth.uid() OR (r.event_id IS NOT NULL AND can_view_event(r.event_id, auth.uid())))
        )
    );

-- Only the recorder can add photos to their own route (route recording
-- is personal, unlike events where any viewer can contribute photos).
CREATE POLICY "Recorder adds photos to their own route"
    ON route_photos FOR INSERT TO authenticated
    WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (SELECT 1 FROM routes r WHERE r.id = route_id AND r.recorded_by = auth.uid())
    );

CREATE POLICY "Uploader deletes their own route photo"
    ON route_photos FOR DELETE TO authenticated
    USING (uploaded_by = auth.uid());
