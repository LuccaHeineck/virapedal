import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapPoint } from '../components/RouteMap/mapHtml';
import { getQueuedPoints, subscribeTracking } from '../lib/routeTracking';
import { supabase } from '../lib/supabase';

// O PostgREST corta cada resposta em 1000 linhas; 2h de pedal dão ~1500
// pontos, então a busca vai em páginas.
const PAGE_SIZE = 1000;
const VIEWER_POLL_MS = 15_000;

const GENERIC_LOAD_ERROR = 'Não foi possível carregar o traçado.';

type PointRow = { latitude: number | string; longitude: number | string; recorded_at: string };

type TimedPoint = MapPoint & { recorded_at: string };

function toTimed(row: PointRow): TimedPoint {
  // DECIMAL pode chegar como string pelo PostgREST.
  return { latitude: Number(row.latitude), longitude: Number(row.longitude), recorded_at: row.recorded_at };
}

// Junta duas listas ordenadas por recorded_at sem repetir pontos: o mesmo
// ponto pode estar no banco e ainda na fila local (enviado, mas a fila só
// é limpa depois da resposta).
function mergePoints(a: TimedPoint[], b: TimedPoint[]): TimedPoint[] {
  const byTime = new Map<string, TimedPoint>();
  [...a, ...b].forEach((point) => byTime.set(point.recorded_at, point));
  return [...byTime.values()].sort((x, y) => x.recorded_at.localeCompare(y.recorded_at));
}

export function useRoutePoints(routeId: number, { live, isOwner }: { live: boolean; isOwner: boolean }) {
  const [points, setPoints] = useState<TimedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pointsRef = useRef<TimedPoint[]>([]);

  const apply = useCallback((next: TimedPoint[]) => {
    pointsRef.current = next;
    setPoints(next);
  }, []);

  const fetchPoints = useCallback(async () => {
    setError(null);
    const rows: PointRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error: selectError } = await supabase
        .from('route_points')
        .select('latitude, longitude, recorded_at')
        .eq('route_id', routeId)
        .order('recorded_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
        .returns<PointRow[]>();

      if (selectError || !data) {
        setError(GENERIC_LOAD_ERROR);
        setLoading(false);
        return;
      }
      rows.push(...data);
      if (data.length < PAGE_SIZE) {
        break;
      }
    }

    // O dono também vê o que ainda não subiu: sem sinal, a linha continua
    // andando com os pontos da fila local.
    const queued = isOwner ? (await getQueuedPoints(routeId)).map(toTimed) : [];
    apply(mergePoints(rows.map(toTimed), queued));
    setLoading(false);
  }, [routeId, isOwner, apply]);

  useEffect(() => {
    setLoading(true);
    fetchPoints();
  }, [fetchPoints]);

  // Dono gravando: cada ponto aceito pela task chega pelo emitter, sem ida ao
  // banco.
  useEffect(() => {
    if (!isOwner) {
      return;
    }
    return subscribeTracking((event) => {
      if (event.routeId !== routeId || event.points.length === 0) {
        return;
      }
      apply(mergePoints(pointsRef.current, event.points.map(toTimed)));
    });
  }, [isOwner, routeId, apply]);

  // Quem acompanha a rota de outra pessoa só tem o banco: relê enquanto ela
  // estiver gravando.
  useEffect(() => {
    if (isOwner || !live) {
      return;
    }
    const timer = setInterval(fetchPoints, VIEWER_POLL_MS);
    return () => clearInterval(timer);
  }, [isOwner, live, fetchPoints]);

  return { points: points as MapPoint[], loading, error, refresh: fetchPoints };
}
