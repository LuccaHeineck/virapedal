import { useCallback, useEffect, useRef, useState } from 'react';
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
  // Só vale para grupos privados: aparece em "Descobrir" para quem não é
  // membro (apenas nome e admins) e aceita solicitações de entrada.
  discoverable: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Membros ativos, via a computed column members_count() do PostgREST
  // (migration 20260903120000). Só vem preenchido em SELECTs sobre a tabela
  // groups — o retorno do RPC create_group não inclui.
  members_count: number;
};

export const GROUP_COLUMNS =
  'id, name, description, image_url, privacy, discoverable, created_by, created_at, updated_at, members_count';

// O que quem não é membro enxerga de um grupo privado visível, via a RPC
// discoverable_private_groups (o RLS de groups não deixa ver a linha).
export type PrivateGroupPreview = {
  id: number;
  name: string;
  created_at: string;
  admin_names: string[];
  has_pending_request: boolean;
};

const GENERIC_LOAD_ERROR = 'Não foi possível carregar os grupos. Tente novamente.';

export function useGroups() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  // Grupos em que o usuário é admin ativo, para o selo na lista.
  const [adminGroupIds, setAdminGroupIds] = useState<Set<number>>(new Set());
  // Solicitações de entrada pendentes por grupo, só nos grupos que o
  // usuário administra (o RLS de group_join_requests só mostra a admins).
  const [pendingRequestCounts, setPendingRequestCounts] = useState<Map<number, number>>(new Map());
  const [privateDiscoverGroups, setPrivateDiscoverGroups] = useState<PrivateGroupPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `loading` só vale para a primeira carga: depois disso, recarregar (voltar
  // para a tela, puxar para atualizar) mantém a lista atual na tela e troca
  // os dados quando chegam -- antes a lista sumia e a tela piscava.
  const hasLoaded = useRef(false);

  // O RLS já restringe o SELECT em groups a públicos + grupos dos quais o
  // usuário é membro ativo, então uma segunda query só nas próprias
  // memberships ativas é suficiente para separar "meus grupos" de
  // "descobrir" no cliente — sem isso, um grupo privado do qual não sou
  // membro nunca aparece de qualquer forma. Lista vazia em qualquer uma das
  // duas pode significar tanto "não há grupos" quanto "sem acesso",
  // indistinguivelmente (ver empty states nas telas).
  const fetchGroups = useCallback(async () => {
    if (!hasLoaded.current) {
      setLoading(true);
    }
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const [groupsResult, membershipsResult, privateResult] = await Promise.all([
      supabase.from('groups').select(GROUP_COLUMNS).order('created_at', { ascending: false }).returns<Group[]>(),
      supabase.from('group_members').select('group_id, role').eq('user_id', userData.user.id).is('left_at', null),
      supabase.rpc('discoverable_private_groups'),
    ]);

    if (groupsResult.error || !groupsResult.data || membershipsResult.error || !membershipsResult.data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const myGroupIds = new Set(membershipsResult.data.map((row) => row.group_id));
    const adminIds = membershipsResult.data.filter((row) => row.role === 'admin').map((row) => row.group_id);

    // Falha aqui não derruba a lista: os grupos aparecem sem o indicador.
    const counts = new Map<number, number>();
    if (adminIds.length > 0) {
      const { data: requests } = await supabase
        .from('group_join_requests')
        .select('group_id')
        .in('group_id', adminIds)
        .eq('status', 'pending')
        .returns<{ group_id: number }[]>();
      requests?.forEach((request) => counts.set(request.group_id, (counts.get(request.group_id) ?? 0) + 1));
    }

    setAdminGroupIds(new Set(adminIds));
    // Falha na vitrine de privados também não derruba a lista de públicos.
    setPrivateDiscoverGroups((privateResult.data as PrivateGroupPreview[] | null) ?? []);
    setPendingRequestCounts(counts);
    setMyGroups(groupsResult.data.filter((g) => myGroupIds.has(g.id)));
    setDiscoverGroups(groupsResult.data.filter((g) => !myGroupIds.has(g.id)));
    hasLoaded.current = true;
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    myGroups,
    discoverGroups,
    privateDiscoverGroups,
    adminGroupIds,
    pendingRequestCounts,
    loading,
    error,
    refresh: fetchGroups,
  };
}
