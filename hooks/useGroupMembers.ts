import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GroupRole } from './useGroup';

export type GroupMemberRow = {
  id: number;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  users: { name: string; profile_photo_url: string | null } | null;
};

const MEMBER_COLUMNS = 'id, user_id, role, joined_at, users(name, profile_photo_url)';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar os membros. Tente novamente.';
const GENERIC_REMOVE_ERROR = 'Não foi possível remover o membro. Tente novamente.';
const GENERIC_ROLE_ERROR = 'Não foi possível alterar o papel do membro. Tente novamente.';

export function useGroupMembers(groupId: number) {
  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Visível apenas a membros do grupo, via RLS — uma lista vazia para um
  // não-membro é indistinguível de um grupo sem membros ativos.
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('group_members')
      .select(MEMBER_COLUMNS)
      .eq('group_id', groupId)
      .is('left_at', null)
      .order('joined_at', { ascending: true })
      .returns<GroupMemberRow[]>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setMembers(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const removeMember = useCallback(
    async (memberId: number) => {
      setMutationError(null);

      const { data, error: updateError } = await supabase
        .from('group_members')
        .update({ left_at: new Date().toISOString() })
        .eq('id', memberId)
        .select('id')
        .single();

      if (updateError || !data) {
        setMutationError(GENERIC_REMOVE_ERROR);
        return false;
      }

      await fetchMembers();
      return true;
    },
    [fetchMembers]
  );

  const changeRole = useCallback(
    async (memberId: number, role: GroupRole) => {
      setMutationError(null);

      const { data, error: updateError } = await supabase
        .from('group_members')
        .update({ role })
        .eq('id', memberId)
        .select('id')
        .single();

      if (updateError || !data) {
        setMutationError(GENERIC_ROLE_ERROR);
        return false;
      }

      await fetchMembers();
      return true;
    },
    [fetchMembers]
  );

  return { members, loading, error, refresh: fetchMembers, removeMember, changeRole, mutationError };
}
