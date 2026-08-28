import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

const GENERIC_JOIN_ERROR = 'Não foi possível entrar no grupo. Tente novamente.';
const GENERIC_REQUEST_ERROR = 'Não foi possível enviar a solicitação. Tente novamente.';

export function useJoin(groupId: number) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permitido pelo RLS apenas para grupos públicos — o próprio usuário se
  // insere como 'member'.
  const joinPublicGroup = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_JOIN_ERROR);
      setSubmitting(false);
      return false;
    }

    const { data, error: insertError } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: userData.user.id, role: 'member' })
      .select('id')
      .single();

    setSubmitting(false);
    if (insertError || !data) {
      setError(GENERIC_JOIN_ERROR);
      return false;
    }
    return true;
  }, [groupId]);

  const requestToJoin = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_REQUEST_ERROR);
      setSubmitting(false);
      return false;
    }

    const { data, error: insertError } = await supabase
      .from('group_join_requests')
      .insert({ group_id: groupId, requested_by: userData.user.id, status: 'pending' })
      .select('id')
      .single();

    setSubmitting(false);
    if (insertError || !data) {
      setError(GENERIC_REQUEST_ERROR);
      return false;
    }
    return true;
  }, [groupId]);

  return { joinPublicGroup, requestToJoin, submitting, error };
}
