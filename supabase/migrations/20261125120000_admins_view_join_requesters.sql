-- Quem pede para entrar num grupo ainda não tem grupo em comum com os admins
-- dele, então a regra anterior escondia o perfil e a tela de Solicitações
-- mostrava "Usuário". O admin precisa saber quem está pedindo para decidir:
-- enquanto a solicitação estiver pendente, os admins ativos daquele grupo
-- veem o perfil de quem pediu. Aprovada ou recusada, volta a valer só a
-- regra de grupo em comum.
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
        OR EXISTS (
            SELECT 1
            FROM public.group_join_requests req
            JOIN public.group_members admin ON admin.group_id = req.group_id
            WHERE req.requested_by = p_user_id
              AND req.status = 'pending'
              AND admin.user_id = auth.uid()
              AND admin.role = 'admin'
              AND admin.left_at IS NULL
        )
      );
$$;
