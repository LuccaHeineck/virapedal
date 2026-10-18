import type { TrackedPoint, TrackingTotals } from './core';

// Pub-sub no molde do homeRefreshEmitter: a task de localização avisa a tela
// de detalhe aberta a cada ponto aceito, para a linha do mapa e a
// quilometragem andarem sem esperar o Supabase. Só funciona quando a task roda
// no mesmo contexto JS do app aberto -- com o app fechado não há tela para
// ouvir, e a tela relê tudo do AsyncStorage ao abrir.
export type TrackingEvent = {
  routeId: number;
  points: TrackedPoint[];
  totals: TrackingTotals;
};

type Listener = (event: TrackingEvent) => void;

const listeners = new Set<Listener>();

export function subscribeTracking(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTracking(event: TrackingEvent) {
  listeners.forEach((listener) => listener(event));
}
