import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type GroupPrivacy = 'public' | 'private';

export type Group = {
  id: number;
  name: string;
  description: string | null;
  // Caminho dentro do bucket privado group-images (ex.: "42/cover"), não uma
  // URL navegável. Renderize via useSignedImageUrl.
  image_url: string | null;
  privacy: GroupPrivacy;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const GROUP_COLUMNS = 'id, name, description, image_url, privacy, created_by, created_at, updated_at';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar os grupos. Tente novamente.';

export function useGroups() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // O RLS já restringe o SELECT em groups a públicos + grupos dos quais o
  // usuário é membro ativo, então uma segunda query só nas próprias
  // memberships ativas é suficiente para separar "meus grupos" de
  // "descobrir" no cliente — sem isso, um grupo privado do qual não sou
  // membro nunca aparece de qualquer forma. Lista vazia em qualquer uma das
  // duas pode significar tanto "não há grupos" quanto "sem acesso",
  // indistinguivelmente (ver empty states nas telas).
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const [groupsResult, membershipsResult] = await Promise.all([
      supabase.from('groups').select(GROUP_COLUMNS).order('created_at', { ascending: false }).returns<Group[]>(),
      supabase.from('group_members').select('group_id').eq('user_id', userData.user.id).is('left_at', null),
    ]);

    if (groupsResult.error || !groupsResult.data || membershipsResult.error || !membershipsResult.data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const myGroupIds = new Set(membershipsResult.data.map((row) => row.group_id));
    setMyGroups(groupsResult.data.filter((g) => myGroupIds.has(g.id)));
    setDiscoverGroups(groupsResult.data.filter((g) => !myGroupIds.has(g.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { myGroups, discoverGroups, loading, error, refresh: fetchGroups };
}
