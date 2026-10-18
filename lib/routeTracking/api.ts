import type { Route } from '../../hooks/useRoutes';
import {
  beginSession,
  clearSession,
  emptyTotals,
  flushQueue,
  loadSession,
  resumeSession,
  setRecording,
  TrackingSession,
  TrackingTotals,
} from './core';

// O que muda entre plataformas é só como as localizações chegam: task em
// segundo plano no celular, watchPosition na web.
export type LocationDriver = {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
};

type RouteTotalsSource = Pick<
  Route,
  'id' | 'distance_meters' | 'duration_seconds' | 'elevation_gain_meters' | 'max_altitude_meters' | 'min_altitude_meters'
>;

// Sem sessão local (app reinstalado, outro aparelho), a retomada parte dos
// totais que o último flush deixou no banco em vez de zerar a rota.
function totalsFromRoute(route: RouteTotalsSource): TrackingTotals {
  const num = (value: number | null) => (value === null ? null : Number(value));
  return {
    ...emptyTotals(),
    distanceMeters: num(route.distance_meters) ?? 0,
    movingSeconds: num(route.duration_seconds) ?? 0,
    elevationGain: num(route.elevation_gain_meters) ?? 0,
    maxAltitude: num(route.max_altitude_meters),
    minAltitude: num(route.min_altitude_meters),
  };
}

export function createTrackingApi(driver: LocationDriver) {
  async function startTracking(routeId: number): Promise<void> {
    await beginSession(routeId);
    await driver.start();
  }

  async function pauseTracking(): Promise<void> {
    await driver.stop();
    await setRecording(false);
    await flushQueue();
  }

  async function resumeTracking(route: RouteTotalsSource): Promise<void> {
    await resumeSession(route.id, totalsFromRoute(route));
    await driver.start();
  }

  // Para o GPS e devolve os totais para o "finalizar" gravar na rota. A
  // sessão continua salva até clearTracking(): se o UPDATE de finalização
  // falhar, a tela pode tentar de novo com os mesmos números.
  async function stopTracking(routeId: number): Promise<TrackingTotals | null> {
    await driver.stop();
    const session = await setRecording(false);
    await flushQueue();
    return session?.routeId === routeId ? session.totals : null;
  }

  async function clearTracking(routeId: number): Promise<void> {
    await clearSession(routeId);
  }

  // "Gravando de fato": a sessão diz que sim E o GPS está ligado. As duas
  // coisas divergem quando o celular reinicia ou o app é encerrado à força
  // -- a tela usa isso para oferecer "Retomar gravação".
  async function isRecording(routeId: number): Promise<boolean> {
    const session = await loadSession();
    if (!session || session.routeId !== routeId || !session.recording) {
      return false;
    }
    return driver.isRunning();
  }

  function getActiveSession(): Promise<TrackingSession | null> {
    return loadSession();
  }

  return { startTracking, pauseTracking, resumeTracking, stopTracking, clearTracking, isRecording, getActiveSession };
}
