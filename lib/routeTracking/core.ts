import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationObject } from 'expo-location';
import { supabase } from '../supabase';
import { emitTracking } from './emitter';

// Núcleo da gravação de rotas, comum ao nativo (task em segundo plano) e à
// web (watchPosition). Tudo que precisa sobreviver entre uma execução e outra
// da task mora no AsyncStorage: com o app fechado, o SO acorda o JS num
// contexto novo só para entregar as localizações, e a memória do módulo não
// existe mais.

export type TrackedPoint = {
  route_id: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  recorded_at: string;
};

export type TrackingTotals = {
  distanceMeters: number;
  movingSeconds: number;
  elevationGain: number;
  maxAltitude: number | null;
  minAltitude: number | null;
};

export type TrackingSession = {
  routeId: number;
  // false quando pausada ou já parada à espera do "finalizar" chegar ao banco.
  recording: boolean;
  totals: TrackingTotals;
  last: { latitude: number; longitude: number; timestamp: number } | null;
  // Altitude de referência da histerese -- ver ingest().
  altAnchor: number | null;
};

const SESSION_KEY = 'virapedal:route-tracking-session';
const QUEUE_KEY = 'virapedal:route-points-queue';

// Filtros. Os valores vêm do uso de bike: abaixo de 1 m/s é empurrar a bike
// ou estar parado no semáforo; acima de 30 m/s (108 km/h) é salto do GPS.
const MAX_ACCURACY_METERS = 30;
const MAX_ALTITUDE_ACCURACY_METERS = 15;
const MIN_STEP_METERS = 3;
const MIN_MOVING_SPEED = 1;
const MAX_PLAUSIBLE_SPEED = 30;
const MAX_MOVING_GAP_SECONDS = 60;
// O GPS oscila alguns metros na vertical mesmo parado; somar cada oscilação
// inflaria a subida de um pedal plano para centenas de metros.
const ELEVATION_HYSTERESIS_METERS = 4;

const FLUSH_BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30_000;

export function emptyTotals(): TrackingTotals {
  return { distanceMeters: 0, movingSeconds: 0, elevationGain: 0, maxAltitude: null, minAltitude: null };
}

// --- Exclusão mútua -------------------------------------------------------
// A task e as telas fazem leitura-modificação-escrita no mesmo AsyncStorage.
// Um lote de localizações chegando no meio de um "pausar" perderia uma das
// duas escritas sem esta fila.
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // JSON corrompido equivale a "nada salvo": melhor perder a sessão local
    // do que travar a gravação inteira num parse que nunca vai passar.
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function loadSession(): Promise<TrackingSession | null> {
  return readJson<TrackingSession>(SESSION_KEY);
}

async function loadQueue(): Promise<TrackedPoint[]> {
  return (await readJson<TrackedPoint[]>(QUEUE_KEY)) ?? [];
}

// --- Ciclo de vida da sessão -----------------------------------------------

export function beginSession(routeId: number, totals: TrackingTotals = emptyTotals()): Promise<TrackingSession> {
  return withLock(async () => {
    const session: TrackingSession = { routeId, recording: true, totals, last: null, altAnchor: null };
    await writeJson(SESSION_KEY, session);
    return session;
  });
}

// Retomar zera o último ponto e a âncora de altitude: o trecho entre onde a
// rota pausou e onde ela recomeça não foi pedalado com o GPS ligado, então
// não entra nem na distância nem na subida.
export function resumeSession(routeId: number, fallbackTotals: TrackingTotals): Promise<TrackingSession> {
  return withLock(async () => {
    const current = await loadSession();
    const totals = current?.routeId === routeId ? current.totals : fallbackTotals;
    const session: TrackingSession = { routeId, recording: true, totals, last: null, altAnchor: null };
    await writeJson(SESSION_KEY, session);
    return session;
  });
}

export function setRecording(recording: boolean): Promise<TrackingSession | null> {
  return withLock(async () => {
    const session = await loadSession();
    if (!session) {
      return null;
    }
    const next = { ...session, recording };
    await writeJson(SESSION_KEY, next);
    return next;
  });
}

export function clearSession(routeId: number): Promise<void> {
  return withLock(async () => {
    const session = await loadSession();
    if (session?.routeId === routeId) {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  });
}

export async function getQueuedPoints(routeId: number): Promise<TrackedPoint[]> {
  return (await loadQueue()).filter((point) => point.route_id === routeId);
}

// --- Ingestão ----------------------------------------------------------------

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Aplica uma localização à sessão. Devolve o ponto a gravar, ou null quando
// ela é descartada. Função pura sobre `session` (mutada no lugar) para poder
// ser exercitada sem AsyncStorage nem GPS.
export function applyLocation(session: TrackingSession, location: LocationObject): TrackedPoint | null {
  const { latitude, longitude, altitude, accuracy, altitudeAccuracy } = location.coords;
  const timestamp = location.timestamp;

  if (accuracy !== null && accuracy !== undefined && accuracy > MAX_ACCURACY_METERS) {
    return null;
  }
  if (session.last && timestamp <= session.last.timestamp) {
    return null;
  }

  const totals = session.totals;

  if (session.last) {
    const step = haversineMeters(session.last, { latitude, longitude });
    const seconds = (timestamp - session.last.timestamp) / 1000;
    const speed = seconds > 0 ? step / seconds : 0;

    if (speed > MAX_PLAUSIBLE_SPEED) {
      return null;
    }
    if (step < MIN_STEP_METERS) {
      // Parado: nem distância nem ponto novo. `last` fica onde estava, então o
      // tempo parado cai num intervalo longo/lento e não conta como movimento.
      return null;
    }

    totals.distanceMeters += step;
    if (speed >= MIN_MOVING_SPEED && seconds <= MAX_MOVING_GAP_SECONDS) {
      totals.movingSeconds += seconds;
    }
  }

  const altitudeValid =
    altitude !== null &&
    altitude !== undefined &&
    (altitudeAccuracy === null || altitudeAccuracy === undefined || altitudeAccuracy <= MAX_ALTITUDE_ACCURACY_METERS);

  if (altitudeValid) {
    totals.maxAltitude = totals.maxAltitude === null ? altitude : Math.max(totals.maxAltitude, altitude);
    totals.minAltitude = totals.minAltitude === null ? altitude : Math.min(totals.minAltitude, altitude);

    if (session.altAnchor === null) {
      session.altAnchor = altitude;
    } else if (altitude - session.altAnchor >= ELEVATION_HYSTERESIS_METERS) {
      totals.elevationGain += altitude - session.altAnchor;
      session.altAnchor = altitude;
    } else if (session.altAnchor - altitude >= ELEVATION_HYSTERESIS_METERS) {
      session.altAnchor = altitude;
    }
  }

  session.last = { latitude, longitude, timestamp };

  return {
    route_id: session.routeId,
    latitude,
    longitude,
    altitude: altitudeValid ? altitude : null,
    recorded_at: new Date(timestamp).toISOString(),
  };
}

export async function ingest(locations: LocationObject[]): Promise<void> {
  const accepted = await withLock(async () => {
    const session = await loadSession();
    if (!session || !session.recording) {
      // Um lote atrasado que chega depois do "pausar" não deve virar trilha.
      return null;
    }

    const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
    const points: TrackedPoint[] = [];
    for (const location of sorted) {
      const point = applyLocation(session, location);
      if (point) {
        points.push(point);
      }
    }

    await writeJson(SESSION_KEY, session);
    if (points.length > 0) {
      const queue = await loadQueue();
      await writeJson(QUEUE_KEY, [...queue, ...points]);
    }
    return { session, points };
  });

  if (!accepted) {
    return;
  }

  emitTracking({ routeId: accepted.session.routeId, points: accepted.points, totals: accepted.session.totals });
  await maybeFlush();
}

// --- Envio ao Supabase -------------------------------------------------------

let flushing: Promise<boolean> | null = null;
// Só em memória: num contexto novo da task começa em 0 e o primeiro lote
// sobe na hora, que é o comportamento desejado depois de um longo silêncio.
let lastFlushAt = 0;

async function maybeFlush(): Promise<void> {
  const queue = await loadQueue();
  if (queue.length >= FLUSH_BATCH_SIZE || Date.now() - lastFlushAt >= FLUSH_INTERVAL_MS) {
    await flushQueue();
  }
}

export function totalsToColumns(totals: TrackingTotals) {
  return {
    distance_meters: Number(totals.distanceMeters.toFixed(2)),
    duration_seconds: Math.round(totals.movingSeconds),
    elevation_gain_meters: Number(totals.elevationGain.toFixed(2)),
    max_altitude_meters: totals.maxAltitude === null ? null : Number(totals.maxAltitude.toFixed(2)),
    min_altitude_meters: totals.minAltitude === null ? null : Number(totals.minAltitude.toFixed(2)),
  };
}

// Sobe a fila de pontos e os totais da sessão atual. Devolve true quando a
// fila ficou vazia. Falha de rede não é erro aqui: os pontos esperam o
// próximo flush -- é o caso normal de um pedal pelo interior sem sinal.
export function flushQueue(): Promise<boolean> {
  if (flushing) {
    return flushing;
  }
  flushing = doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(): Promise<boolean> {
  lastFlushAt = Date.now();

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    // Sem login não há como passar pelo RLS; a fila espera o próximo login.
    return false;
  }

  // O snapshot é feito fora do lock da ingestão: novos pontos podem entrar
  // enquanto este lote está no ar, e só os enviados saem da fila depois.
  const snapshot = await loadQueue();
  const sent = new Set<string>();

  const byRoute = new Map<number, TrackedPoint[]>();
  snapshot.forEach((point) => {
    const list = byRoute.get(point.route_id) ?? [];
    list.push(point);
    byRoute.set(point.route_id, list);
  });

  for (const [routeId, points] of byRoute) {
    // Sem .select(): com ignoreDuplicates o retorno só traria as linhas
    // novas, e aqui basta saber se o lote passou -- o `error` é verificado.
    const { error } = await supabase
      .from('route_points')
      .upsert(points, { onConflict: 'route_id,recorded_at', ignoreDuplicates: true });
    if (!error) {
      points.forEach((point) => sent.add(`${routeId}|${point.recorded_at}`));
    }
  }

  const remaining = await withLock(async () => {
    const queue = await loadQueue();
    const rest = queue.filter((point) => !sent.has(`${point.route_id}|${point.recorded_at}`));
    await writeJson(QUEUE_KEY, rest);
    return rest.length;
  });

  const session = await loadSession();
  if (session) {
    // Totais parciais: a lista de rotas e quem acompanha o pedal veem a
    // quilometragem andar durante a gravação. Erro ignorado de propósito: o
    // próximo flush (ou o "finalizar") manda os mesmos números de novo.
    await supabase.from('routes').update(totalsToColumns(session.totals)).eq('id', session.routeId).select('id');
  }

  return remaining === 0;
}
