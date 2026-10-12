-- Busca autenticada: retorna apenas os campos exibidos no perfil público.
CREATE OR REPLACE FUNCTION public.search_users(p_query text)
RETURNS TABLE (id uuid, name text, profile_photo_url text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT u.id, u.name::text, u.profile_photo_url::text
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

-- Permite abrir um resultado da busca sem ampliar o SELECT da tabela users.
CREATE OR REPLACE FUNCTION public.get_public_user_profile(p_user_id uuid)
RETURNS TABLE (id uuid, name text, profile_photo_url text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
    SELECT u.id, u.name::text, u.profile_photo_url::text
    FROM public.users AS u
    WHERE auth.uid() IS NOT NULL
      AND u.id = p_user_id
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_user_profile(uuid) TO authenticated;
