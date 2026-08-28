import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type JoinRequestRow = {
  id: number;
  requested_by: string;
  created_at: string;
  users: { name: string; profile_photo_url: string | null } | null;
};

// group_join_requests tem duas foreign keys para users (requested_by e
// reviewed_by), então o embed precisa do nome da constraint para não ficar
// ambíguo.
const REQUEST_COLUMNS = 'id, requested_by, created_at, users!group_join_requests_requested_by_fkey(name, profile_photo_url)';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar as solicitações. Tente novamente.';
const GENERIC_RESPOND_ERROR = 'Não foi possível processar a solicitação. Tente novamente.';

export function useJoinRequests(groupId: number) {
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('group_join_requests')
      .select(REQUEST_COLUMNS)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .returns<JoinRequestRow[]>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setRequests(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const respond = useCallback(
    async (requestId: number, approve: boolean) => {
      setRespondError(null);

      const { data, error: rpcError } = await supabase.rpc('respond_to_join_request', {
        p_request_id: requestId,
        p_approve: approve,
      });

      if (rpcError || !data) {
        setRespondError(GENERIC_RESPOND_ERROR);
        return false;
      }

      await fetchRequests();
      return true;
    },
    [fetchRequests]
  );

  return { requests, loading, error, refresh: fetchRequests, respond, respondError };
}
