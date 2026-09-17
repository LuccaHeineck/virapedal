import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type RouteStatus = 'active' | 'paused' | 'finished';

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  finished: 'Finalizada',
};

export type Route = {
  id: number;
  event_id: number | null;
  recorded_by: string;
  name: string | null;
  status: RouteStatus;
  // DECIMAL no Postgres -- o PostgREST pode devolver como string; normalize
  // com Number() ao formatar.
  distance_meters: number | null;
  duration_seconds: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export const ROUTE_COLUMNS =
  'id, event_id, recorded_by, name, status, distance_meters, duration_seconds, started_at, finished_at, created_at, updated_at';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar as rotas. Tente novamente.';

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Ausente devolve null em vez de um traço: quem chama decide a cópia ("aguardando
// GPS" na tela de detalhe), porque um "—" repetido não diz nada a quem lê.
export function formatDistance(meters: number | null): string | null {
  const value = Number(meters);
  if (!meters || Number.isNaN(value) || value <= 0) {
    return null;
  }
  return `${(value / 1000).toFixed(1).replace('.', ',')} km`;
}

// Tempo em movimento, vindo do GPS. Fica nulo até a gravação existir -- para
// o tempo de relógio use formatElapsed, que deriva dos próprios timestamps.
export function formatDuration(seconds: number | null): string | null {
  const value = Number(seconds);
  if (!seconds || Number.isNaN(value) || value <= 0) {
    return null;
  }
  return humanizeMinutes(Math.round(value / 60));
}

// Tempo total de relógio entre início e fim -- inclui as pausas, por isso a
// rótulo na tela diz "tempo total", nunca "em movimento". É o único número
// real que temos antes do GPS entrar.
export function formatElapsed(startedAt: string | null, finishedAt: string | null): string | null {
  if (!startedAt || !finishedAt) {
    return null;
  }
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    return null;
  }
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) {
    return 'menos de 1min';
  }
  return humanizeMinutes(totalMinutes);
}

function humanizeMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}` : `${minutes}min`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// "hoje" / "08 set" / "08 set 2025" -- o ano só aparece quando não é o atual,
// que é quando ele de fato informa algo.
function dayMonthLabel(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return 'hoje';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const base = `${day} ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

export function formatDayMonth(iso: string): string {
  return dayMonthLabel(new Date(iso));
}

// Para events.event_date, que é 'AAAA-MM-DD' sem hora. Parseado em partes
// locais de propósito: new Date('2026-09-09') é meia-noite UTC e, a oeste de
// Greenwich -- o Brasil inteiro --, cai no dia anterior.
export function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return dayMonthLabel(new Date(year, month - 1, day));
}

export function formatLongDate(iso: string): string {
  const date = new Date(iso);
  const base = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === new Date().getFullYear() ? base : `${base} de ${date.getFullYear()}`;
}

// Chave estável por mês para agrupar a lista, e o rótulo que a acompanha.
export function monthKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function monthLabel(iso: string): string {
  const date = new Date(iso);
  const label = MONTHS[date.getMonth()];
  return date.getFullYear() === new Date().getFullYear() ? label : `${label} de ${date.getFullYear()}`;
}

// started_at é nulo em rotas antigas/interrompidas -- created_at sempre existe,
// então serve de âncora para ordenar e agrupar sem abrir buracos na trilha.
export function routeTimestamp(route: Pick<Route, 'started_at' | 'created_at'>): string {
  return route.started_at ?? route.created_at;
}

// Nomear antes de pedalar é a última coisa que alguém quer fazer parado ao
// lado da bike, então a tela de início não pede nome nenhum -- a rota já
// nasce com um rótulo plausível pela hora do dia, editável depois no detalhe.
export function defaultRouteName(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Pedal da manhã';
  }
  if (hour >= 12 && hour < 18) {
    return 'Pedal da tarde';
  }
  if (hour >= 18 && hour < 22) {
    return 'Pedal da noite';
  }
  return 'Pedal da madrugada';
}

// Criação isolada (paralela a createGroupEvent) para ser reutilizada por
// useStartRoute. distance_meters / duration_seconds ficam nulos nesta fase --
// viriam da gravação por GPS. event_id pode vir escolhido já na largada e
// ainda ser corrigido depois, no detalhe da rota finalizada.
export async function startRoute(input: { name: string | null; eventId: number | null }): Promise<Route | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  const { data, error: insertError } = await supabase
    .from('routes')
    .insert({
      recorded_by: userData.user.id,
      // Campo em branco não vira "Rota sem nome": cai no rótulo pela hora do
      // dia, que ao menos diz alguma coisa e continua editável no detalhe.
      name: input.name?.trim() || defaultRouteName(),
      event_id: input.eventId,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select(ROUTE_COLUMNS)
    .single<Route>();

  if (insertError || !data) {
    return null;
  }

  return data;
}

// Forma da rota na lista: além das colunas de routes, o título do pedal
// vinculado (mesmo embed de useRoute) e os caminhos das fotos, mais recentes
// primeiro. As fotos vêm numa segunda consulta por lote -- uma por rota
// seria N+1, e um embed de route_photos traria todas as linhas quando a lista
// só precisa de caminhos.
export type RouteListItem = Route & {
  event_title: string | null;
  photo_paths: string[];
};

const ROUTE_LIST_COLUMNS = `${ROUTE_COLUMNS}, events(title)`;

type RouteListRow = Route & { events: { title: string } | null };

export function useRoutes() {
  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // O RLS de routes já restringe o SELECT ao gravador (ou a quem pode ver o
  // pedal vinculado) -- o filtro por recorded_by aqui é só para a lista
  // "minhas rotas". Lista vazia é um estado legítimo, não erro.
  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { data, error: selectError } = await supabase
      .from('routes')
      .select(ROUTE_LIST_COLUMNS)
      .eq('recorded_by', userData.user.id)
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .returns<RouteListRow[]>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    // Falha ao buscar fotos não derruba a lista: as rotas aparecem sem
    // miniaturas, que é um estado que a linha já sabe desenhar.
    const photosByRoute = new Map<number, string[]>();
    if (data.length > 0) {
      const { data: photos } = await supabase
        .from('route_photos')
        .select('route_id, image_url')
        .in(
          'route_id',
          data.map((route) => route.id)
        )
        .order('created_at', { ascending: false })
        .returns<{ route_id: number; image_url: string }[]>();

      photos?.forEach((photo) => {
        const paths = photosByRoute.get(photo.route_id) ?? [];
        paths.push(photo.image_url);
        photosByRoute.set(photo.route_id, paths);
      });
    }

    setRoutes(
      data.map(({ events, ...route }) => ({
        ...route,
        event_title: events?.title ?? null,
        photo_paths: photosByRoute.get(route.id) ?? [],
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return { routes, loading, error, refresh: fetchRoutes };
}
