import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROUTE_COLUMNS, Route, RouteStatus } from './useRoutes';

// O título do pedal vinculado vem junto para a tela não precisar de uma
// segunda busca só para exibi-lo. routes.event_id tem uma FK única para
// events, então o embed não é ambíguo (ao contrário de event_participants).
const ROUTE_DETAIL_COLUMNS = `${ROUTE_COLUMNS}, events(title)`;

export type RouteDetail = Route & { event_title: string | null };

const GENERIC_LOAD_ERROR = 'Não foi possível carregar a rota. Tente novamente.';
const GENERIC_SAVE_ERROR = 'Não foi possível atualizar a rota. Tente novamente.';

export function useRoute(routeId: number) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Ausência aqui é ambígua entre "rota não existe" e "sem acesso" -- o RLS
  // de routes filtra silenciosamente, mesmo caso do useEvent / useGroup.
  //
  // Não liga `loading` aqui: ele significa "nada para mostrar ainda", não
  // "buscando". Toda gravação e todo foco de tela rebuscam a rota, e trocar
  // o detalhe inteiro pelo spinner a cada uma delas piscava a tela -- os
  // dados novos entram no lugar dos antigos, sem passar pelo vazio.
  const fetchRoute = useCallback(async () => {
    setError(null);

    const { data, error: selectError } = await supabase
      .from('routes')
      .select(ROUTE_DETAIL_COLUMNS)
      .eq('id', routeId)
      .maybeSingle<Route & { events: { title: string } | null }>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { events, ...rest } = data;
    setRoute({ ...rest, event_title: events?.title ?? null });
    setLoading(false);
  }, [routeId]);

  // fetchRoute só muda com routeId, então isto é o carregamento inicial de
  // cada rota -- o único momento em que o spinner cabe.
  useEffect(() => {
    setLoading(true);
    fetchRoute();
  }, [fetchRoute]);

  // Única gravação compartilhada pelas três mutações da tela: todas são um
  // UPDATE numa linha de routes que o RLS já restringe ao gravador.
  const patchRoute = useCallback(
    async (patch: Record<string, unknown>): Promise<boolean> => {
      setSubmitting(true);
      setSaveError(null);

      const { data, error: updateError } = await supabase
        .from('routes')
        .update(patch)
        .eq('id', routeId)
        .select('id')
        .single();

      setSubmitting(false);
      if (updateError || !data) {
        setSaveError(GENERIC_SAVE_ERROR);
        return false;
      }

      await fetchRoute();
      return true;
    },
    [routeId, fetchRoute]
  );

  // Transições active <-> paused -> finished. Ao finalizar, grava finished_at.
  // Sem cálculo de distância/duração nesta fase -- viriam do GPS.
  const updateStatus = useCallback(
    (next: RouteStatus) =>
      patchRoute({
        status: next,
        ...(next === 'finished' ? { finished_at: new Date().toISOString() } : {}),
      }),
    [patchRoute]
  );

  const updateName = useCallback((name: string) => patchRoute({ name: name.trim() || null }), [patchRoute]);

  // Vincular a rota a um pedal a torna visível a quem pode ver aquele pedal
  // (policy "View photos of visible routes" / SELECT de routes). A tela avisa
  // disso antes -- não é um detalhe técnico, é uma mudança de privacidade.
  const updateEvent = useCallback((eventId: number | null) => patchRoute({ event_id: eventId }), [patchRoute]);

  return { route, loading, error, refresh: fetchRoute, updateStatus, updateName, updateEvent, submitting, saveError };
}
