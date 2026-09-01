CREATE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- tabela pública de users, (email, senha ficam em auth.users do supabase) ficam atualizadas com o trigger abaixo
CREATE TABLE users (
    id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name               VARCHAR(150) NOT NULL,
    profile_photo_url  VARCHAR(500),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a profile row whenever someone signs up via Supabase Auth
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, profile_photo_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'New rider'),
        NEW.raw_user_meta_data->>'profile_photo_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE groups (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    image_url    VARCHAR(500),
    privacy      VARCHAR(20) NOT NULL CHECK (privacy IN ('public', 'private')),
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_created_by ON groups(created_by);

CREATE TRIGGER trg_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE group_members (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id    BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('member', 'admin')) DEFAULT 'member',
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at     TIMESTAMPTZ
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- Only one *active* membership per user per group; allows rejoin history
CREATE UNIQUE INDEX idx_group_members_active_unique
    ON group_members(group_id, user_id)
    WHERE left_at IS NULL;

-- Auto-add the group creator as an admin member so private groups always have someone
-- able to approve join requests / manage membership
CREATE FUNCTION add_group_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_group_created
    AFTER INSERT ON groups
    FOR EACH ROW EXECUTE FUNCTION add_group_creator_as_admin();

CREATE TABLE group_join_requests (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id      BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    requested_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    reviewed_by   UUID REFERENCES users(id),
    reviewed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_join_requests_group ON group_join_requests(group_id);
CREATE INDEX idx_join_requests_user ON group_join_requests(requested_by);

-- Prevent duplicate pending requests from the same user for the same group
CREATE UNIQUE INDEX idx_join_requests_pending_unique
    ON group_join_requests(group_id, requested_by)
    WHERE status = 'pending';

CREATE TABLE events (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id           BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by         UUID NOT NULL REFERENCES users(id),
    title              VARCHAR(150) NOT NULL,
    description        TEXT,
    event_date         DATE NOT NULL,
    start_time         TIME NOT NULL,
    meeting_point      VARCHAR(255),
    route_description  TEXT,  -- percurso ou localização
    status             VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_group ON events(group_id);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_date ON events(event_date);

CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_participants (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id       BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    guest_name     VARCHAR(150),
    added_by       UUID REFERENCES users(id),  -- admin que adicionou participante, null se foi self confirm
    status         VARCHAR(20) NOT NULL CHECK (status IN ('confirmed', 'maybe', 'cancelled')) DEFAULT 'confirmed',
    confirmed_at   TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_participant_identity CHECK (
        (user_id IS NOT NULL AND guest_name IS NULL) OR
        (user_id IS NULL AND guest_name IS NOT NULL)
    )
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);

-- Uma participação por user por event
CREATE UNIQUE INDEX idx_event_participants_user_unique
    ON event_participants(event_id, user_id)
    WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_event_participants_updated_at
    BEFORE UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_photos (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id     BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    uploaded_by  UUID NOT NULL REFERENCES users(id),
    image_url    VARCHAR(500) NOT NULL,
    caption      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_photos_event ON event_photos(event_id);
CREATE INDEX idx_event_photos_uploaded_by ON event_photos(uploaded_by);

CREATE TABLE routes (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id          BIGINT REFERENCES events(id) ON DELETE SET NULL,
    recorded_by       UUID NOT NULL REFERENCES users(id),
    name              VARCHAR(150),
    status            VARCHAR(20) NOT NULL CHECK (status IN ('active', 'paused', 'finished')) DEFAULT 'active',
    distance_meters   DECIMAL(12,2),
    duration_seconds  INTEGER,
    started_at        TIMESTAMPTZ,
    finished_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routes_event ON routes(event_id);
CREATE INDEX idx_routes_recorded_by ON routes(recorded_by);

CREATE TRIGGER trg_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE route_points ( -- trilha GPS
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    route_id     BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    latitude     DECIMAL(10,7) NOT NULL,
    longitude    DECIMAL(10,7) NOT NULL,
    altitude     DECIMAL(8,2),
    recorded_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_route_points_route ON route_points(route_id);
CREATE INDEX idx_route_points_recorded_at ON route_points(route_id, recorded_at);

CREATE TABLE event_changes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id    BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    changed_by  UUID NOT NULL REFERENCES users(id),
    field_name  VARCHAR(100) NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_changes_event ON event_changes(event_id);

-- =========================================================
-- RLS HELPER FUNCTIONS
-- =========================================================
CREATE FUNCTION is_group_member(p_group_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = p_group_id AND user_id = p_user_id AND left_at IS NULL
    );
$$;

CREATE FUNCTION is_group_admin(p_group_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
          AND role = 'admin' AND left_at IS NULL
    );
$$;

CREATE FUNCTION can_view_event(p_event_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.events e
        JOIN public.groups g ON g.id = e.group_id
        WHERE e.id = p_event_id
          AND (g.privacy = 'public' OR public.is_group_member(g.id, p_user_id))
    );
$$;

GRANT EXECUTE ON FUNCTION is_group_member(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_admin(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_event(BIGINT, UUID) TO authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_changes ENABLE ROW LEVEL SECURITY;

-- --- users ---
CREATE POLICY "View own profile"
    ON users FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "View profiles of groupmates"
    ON users FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm1
            JOIN group_members gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = auth.uid() AND gm1.left_at IS NULL
              AND gm2.user_id = users.id AND gm2.left_at IS NULL
        )
    );

CREATE POLICY "Update own profile"
    ON users FOR UPDATE TO authenticated
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- --- groups ---
CREATE POLICY "View public groups or own groups"
    ON groups FOR SELECT TO authenticated
    USING (privacy = 'public' OR is_group_member(id, auth.uid()));

CREATE POLICY "Create a group"
    ON groups FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins update their group"
    ON groups FOR UPDATE TO authenticated
    USING (is_group_admin(id, auth.uid()))
    WITH CHECK (is_group_admin(id, auth.uid()));

-- --- group_members ---
CREATE POLICY "View membership of your groups"
    ON group_members FOR SELECT TO authenticated
    USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Join a public group or be added by an admin"
    ON group_members FOR INSERT TO authenticated
    WITH CHECK (
        (user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM groups g WHERE g.id = group_id AND g.privacy = 'public'
        ))
        OR is_group_admin(group_id, auth.uid())
    );

CREATE POLICY "Admins manage roles, members can leave"
    ON group_members FOR UPDATE TO authenticated
    USING (is_group_admin(group_id, auth.uid()) OR user_id = auth.uid())
    WITH CHECK (is_group_admin(group_id, auth.uid()) OR user_id = auth.uid());

-- --- group_join_requests ---
CREATE POLICY "Requesters and admins view join requests"
    ON group_join_requests FOR SELECT TO authenticated
    USING (requested_by = auth.uid() OR is_group_admin(group_id, auth.uid()));

CREATE POLICY "Request to join a group"
    ON group_join_requests FOR INSERT TO authenticated
    WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins review join requests"
    ON group_join_requests FOR UPDATE TO authenticated
    USING (is_group_admin(group_id, auth.uid()))
    WITH CHECK (is_group_admin(group_id, auth.uid()));

-- --- events ---
CREATE POLICY "View events of visible groups"
    ON events FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = group_id
              AND (g.privacy = 'public' OR is_group_member(g.id, auth.uid()))
        )
    );

CREATE POLICY "Members create events"
    ON events FOR INSERT TO authenticated
    WITH CHECK (is_group_member(group_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Creator or admin edits event"
    ON events FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR is_group_admin(group_id, auth.uid()))
    WITH CHECK (created_by = auth.uid() OR is_group_admin(group_id, auth.uid()));

-- --- event_participants ---
CREATE POLICY "View participants of visible events"
    ON event_participants FOR SELECT TO authenticated
    USING (can_view_event(event_id, auth.uid()));

CREATE POLICY "Confirm own presence or admin adds a guest"
    ON event_participants FOR INSERT TO authenticated
    WITH CHECK (
        (user_id = auth.uid() AND can_view_event(event_id, auth.uid()))
        OR (
            guest_name IS NOT NULL AND added_by = auth.uid()
            AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_group_admin(e.group_id, auth.uid()))
        )
    );

CREATE POLICY "Update own participation or admin manages it"
    ON event_participants FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR added_by = auth.uid()
        OR EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_group_admin(e.group_id, auth.uid()))
    );

-- --- event_photos ---
CREATE POLICY "View photos of visible events"
    ON event_photos FOR SELECT TO authenticated
    USING (can_view_event(event_id, auth.uid()));

CREATE POLICY "Add photos to visible events"
    ON event_photos FOR INSERT TO authenticated
    WITH CHECK (uploaded_by = auth.uid() AND can_view_event(event_id, auth.uid()));

CREATE POLICY "Uploader or admin deletes a photo"
    ON event_photos FOR DELETE TO authenticated
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_group_admin(e.group_id, auth.uid()))
    );

-- --- routes ---
CREATE POLICY "Recorder or event viewers see a route"
    ON routes FOR SELECT TO authenticated
    USING (
        recorded_by = auth.uid()
        OR (event_id IS NOT NULL AND can_view_event(event_id, auth.uid()))
    );

CREATE POLICY "Record your own route"
    ON routes FOR INSERT TO authenticated
    WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Update your own route"
    ON routes FOR UPDATE TO authenticated
    USING (recorded_by = auth.uid()) WITH CHECK (recorded_by = auth.uid());

-- --- route_points ---
CREATE POLICY "View points of visible routes"
    ON route_points FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM routes r
            WHERE r.id = route_id
              AND (r.recorded_by = auth.uid() OR (r.event_id IS NOT NULL AND can_view_event(r.event_id, auth.uid())))
        )
    );

CREATE POLICY "Recorder inserts their own GPS points"
    ON route_points FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_id AND r.recorded_by = auth.uid()));

-- --- event_changes ---
CREATE POLICY "View change log of visible events"
    ON event_changes FOR SELECT TO authenticated
    USING (can_view_event(event_id, auth.uid()));

CREATE POLICY "Editors log their own changes"
    ON event_changes FOR INSERT TO authenticated
    WITH CHECK (
        changed_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_id
              AND (e.created_by = auth.uid() OR is_group_admin(e.group_id, auth.uid()))
        )
    );