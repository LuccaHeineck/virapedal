import { useCallback, useEffect, useState } from 'react';
import {
  clearTracking,
  getActiveSession,
  isRecording,
  pauseTracking,
  resumeTracking,
  stopTracking,
  subscribeTracking,
  totalsToColumns,
  TrackingTotals,
} from '../lib/routeTracking';
import { ensureTrackingPermission, TrackingPermission } from '../lib/routeTracking/permissions';
import type { RouteDetail } from './useRoute';

const GPS_ERROR = 'Não foi possível ligar o GPS. Tente novamente.';

// Junta a gravação local (GPS + fila) com as mutações de useRoute: cada botão
// do detalhe mexe nas duas coisas, e na ordem certa -- o GPS para antes do
// status mudar, para nenhum ponto chegar depois de "pausada".
export function useRouteRecorder(
  route: RouteDetail | null,
  isOwner: boolean,
  patchRoute: (patch: Record<string, unknown>) => Promise<boolean>
) {
  const routeId = route?.id ?? null;
  // null = ainda não sabemos (primeira leitura do AsyncStorage em andamento).
  const [recording, setRecording] = useState<boolean | null>(null);
  const [liveTotals, setLiveTotals] = useState<TrackingTotals | null>(null);
  const [busy, setBusy] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [permissionIssue, setPermissionIssue] = useState<Exclude<TrackingPermission, 'ok'> | null>(null);

  const sync = useCallback(async () => {
    if (routeId === null || !isOwner) {
      return;
    }
    setRecording(await isRecording(routeId));
    const session = await getActiveSession();
    setLiveTotals(session?.routeId === routeId ? { ...session.totals } : null);
  }, [routeId, isOwner]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    if (routeId === null || !isOwner) {
      return;
    }
    return subscribeTracking((event) => {
      if (event.routeId === routeId) {
        setLiveTotals({ ...event.totals });
      }
    });
  }, [routeId, isOwner]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setRecorderError(null);
      setPermissionIssue(null);
      try {
        await action();
      } catch {
        // startLocationUpdatesAsync é o que costuma lançar aqui (serviço de
        // localização recusado pelo SO); a mensagem genérica basta.
        setRecorderError(GPS_ERROR);
      } finally {
        setBusy(false);
        await sync();
      }
    },
    [sync]
  );

  const pause = useCallback(
    () =>
      run(async () => {
        await pauseTracking();
        await patchRoute({ status: 'paused' });
      }),
    [run, patchRoute]
  );

  // Serve tanto para "Retomar" depois de uma pausa quanto para religar uma
  // gravação interrompida (celular reiniciou, app encerrado à força).
  const resume = useCallback(
    () =>
      run(async () => {
        if (!route) {
          return;
        }
        const permission = await ensureTrackingPermission();
        if (permission !== 'ok') {
          setPermissionIssue(permission);
          return;
        }
        await resumeTracking(route);
        if (route.status !== 'active') {
          await patchRoute({ status: 'active' });
        }
      }),
    [run, route, patchRoute]
  );

  const finish = useCallback(
    () =>
      run(async () => {
        if (routeId === null) {
          return;
        }
        // Sem sessão local (rota gravada em outro aparelho), finaliza com os
        // totais que o último flush já deixou no banco.
        const totals = await stopTracking(routeId);
        const ok = await patchRoute({
          status: 'finished',
          finished_at: new Date().toISOString(),
          ...(totals ? totalsToColumns(totals) : {}),
        });
        if (ok) {
          await clearTracking(routeId);
        }
      }),
    [run, routeId, patchRoute]
  );

  const interrupted = isOwner && route?.status === 'active' && recording === false;

  return { recording, interrupted, liveTotals, busy, recorderError, permissionIssue, pause, resume, finish, sync };
}
