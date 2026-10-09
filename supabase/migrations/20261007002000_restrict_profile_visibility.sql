-- O próprio usuário e membros ativos de um mesmo grupo podem ver o perfil.
-- SECURITY DEFINER evita que a consulta a group_members dependa da RLS dessa tabela.
CREATE OR REPLACE FUNCTION public.can_view_user_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT auth.uid() IS NOT NULL
      AND p_user_id IS NOT NULL
      AND (
        p_user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.group_members mine
            JOIN public.group_members theirs ON theirs.group_id = mine.group_id
            WHERE mine.user_id = auth.uid()
              AND theirs.user_id = p_user_id
              AND mine.left_at IS NULL
              AND theirs.left_at IS NULL
        )
      );
$$;

REVOKE ALL ON FUNCTION public.can_view_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_user_profile(uuid) TO authenticated;

-- Ver um pedal público não concede acesso ao perfil dos seus participantes.
DROP POLICY IF EXISTS "View profiles of participants in visible events" ON public.users;

DROP POLICY IF EXISTS "View profiles of groupmates" ON public.users;
CREATE POLICY "View profiles of groupmates"
    ON public.users FOR SELECT TO authenticated
    USING (public.can_view_user_profile(id));

-- A busca ainda encontra pessoas sem grupo em comum, para que o toque abra
-- a tela de perfil restrito, mas não entrega a foto dessas pessoas.
CREATE OR REPLACE FUNCTION public.search_users(p_query text)
RETURNS TABLE (id uuid, name text, profile_photo_url text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT u.id, u.name::text,
      CASE WHEN public.can_view_user_profile(u.id)
        THEN u.profile_photo_url::text ELSE NULL::text END
    FROM public.users AS u
    WHERE auth.uid() IS NOT NULL
      AND char_length(btrim(p_query)) BETWEEN 2 AND 100
      AND position(lower(btrim(p_query)) IN lower(u.name)) > 0
    ORDER BY
      CASE WHEN lower(u.name) = lower(btrim(p_query)) THEN 0 ELSE 1 END,
      u.name,
      u.id
    LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_users(text) TO authenticated;

-- A função antiga contornava a RLS; agora segue a mesma regra do perfil.
CREATE OR REPLACE FUNCTION public.get_public_user_profile(p_user_id uuid)
RETURNS TABLE (id uuid, name text, profile_photo_url text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT u.id, u.name::text, u.profile_photo_url::text
    FROM public.users AS u
    WHERE public.can_view_user_profile(u.id)
      AND u.id = p_user_id
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_user_profile(uuid) TO authenticated;
