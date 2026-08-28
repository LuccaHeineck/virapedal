import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GROUP_COLUMNS, Group } from './useGroups';

export type GroupRole = 'member' | 'admin';

export type GroupMembership = {
  id: number;
  group_id: number;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  left_at: string | null;
};

export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected';

export type JoinRequest = {
  id: number;
  group_id: number;
  requested_by: string;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const GENERIC_LOAD_ERROR = 'Não foi possível carregar o grupo. Tente novamente.';
const GENERIC_LEAVE_ERROR = 'Não foi possível sair do grupo. Tente novamente.';

export function useGroup(groupId: number) {
  const [group, setGroup] = useState<Group | null>(null);
  const [membership, setMembership] = useState<GroupMembership | null>(null);
  const [pendingRequest, setPendingRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }
    const uid = userData.user.id;

    // Uma linha ausente aqui é ambígua entre "grupo não existe" e "sem
    // acesso" (grupo privado do qual não sou membro) — o RLS filtra
    // silenciosamente, então as duas situações recebem a mesma mensagem.
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select(GROUP_COLUMNS)
      .eq('id', groupId)
      .maybeSingle<Group>();

    if (groupError || !groupData) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { data: membershipData } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, role, joined_at, left_at')
      .eq('group_id', groupId)
      .eq('user_id', uid)
      .is('left_at', null)
      .maybeSingle<GroupMembership>();

    let pending: JoinRequest | null = null;
    if (!membershipData && groupData.privacy === 'private') {
      const { data: requestData } = await supabase
        .from('group_join_requests')
        .select('id, group_id, requested_by, status, reviewed_by, reviewed_at, created_at')
        .eq('group_id', groupId)
        .eq('requested_by', uid)
        .eq('status', 'pending')
        .maybeSingle<JoinRequest>();
      pending = requestData ?? null;
    }

    setGroup(groupData);
    setMembership(membershipData ?? null);
    setPendingRequest(pending);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const leaveGroup = useCallback(async () => {
    if (!membership) {
      return false;
    }
    setLeaving(true);
    setLeaveError(null);

    // .select().single() confirma que a linha foi de fato atualizada, já que
    // uma atualização rejeitada pelo RLS retorna 0 linhas silenciosamente.
    const { data, error: updateError } = await supabase
      .from('group_members')
      .update({ left_at: new Date().toISOString() })
      .eq('id', membership.id)
      .select('id')
      .single();

    setLeaving(false);
    if (updateError || !data) {
      setLeaveError(GENERIC_LEAVE_ERROR);
      return false;
    }

    await fetchGroup();
    return true;
  }, [membership, fetchGroup]);

  return { group, membership, pendingRequest, loading, error, refresh: fetchGroup, leaveGroup, leaving, leaveError };
}
