import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROUTE_COLUMNS, Route } from './useRoutes';

export type EventBaseRoute = Route & {
  // null quando o perfil de quem gravou não é visível para quem está vendo
  // (sem grupo em comum) -- o RLS de users devolve o embed vazio.
  recorder_name: string | null;
};

const GENERIC_LOAD_ERROR = 'Não foi possível carregar o percurso do pedal.';

// A escolha de qual rota representa o pedal (organizador > admin > primeiro
// a finalizar) mora no banco, em event_base_route(): assim a regra é uma só
// para qualquer tela que precise dela.
export function useEventBaseRoute(eventId: number) {
  const [route, setRoute] = useState<EventBaseRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBaseRoute = useCallback(async () => {
    setError(null);

    const { data: routeId, error: rpcError } = await supabase.rpc('event_base_route', { p_event_id: eventId });
    if (rpcError) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }
    // Nenhuma rota finalizada ainda: estado legítimo, não erro.
    if (routeId === null) {
      setRoute(null);
      setLoading(false);
      return;
    }

    const { data, error: selectError } = await supabase
      .from('routes')
      .select(`${ROUTE_COLUMNS}, users:recorded_by(name)`)
      .eq('id', routeId)
      .maybeSingle<Route & { users: { name: string } | null }>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { users, ...rest } = data;
    setRoute({ ...rest, recorder_name: users?.name ?? null });
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    fetchBaseRoute();
  }, [fetchBaseRoute]);

  return { route, loading, error, refresh: fetchBaseRoute };
}
