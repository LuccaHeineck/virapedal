import type { LocationObject } from 'expo-location';
import { createTrackingApi } from './api';
import { ingest } from './core';

export { flushQueue, getQueuedPoints, totalsToColumns } from './core';
export type { TrackedPoint, TrackingSession, TrackingTotals } from './core';
export { subscribeTracking } from './emitter';

// Na web a gravação só acontece com a aba aberta (geolocalização do
// navegador). Serve para desenvolver e testar o fluxo de ponta a ponta; o uso
// real num pedal é pelo app no celular.
//
// Usa navigator.geolocation direto, e não Location.watchPositionAsync: na web
// o expo-location guarda o callback com o id do próprio contador, mas entrega
// cada ponto com o id que o navegador devolveu. Se os dois se desencontram
// (aba que já gravou antes, Fast Refresh, simulador de GPS), o primeiro ponto
// não acha o callback, o expo chama clearWatch e a gravação para em silêncio.
let watchId: number | null = null;

function toLocationObject({ coords, timestamp }: GeolocationPosition): LocationObject {
  return {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      accuracy: coords.accuracy,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
    },
    timestamp,
  };
}

export const {
  startTracking,
  pauseTracking,
  resumeTracking,
  stopTracking,
  clearTracking,
  isRecording,
  getActiveSession,
} = createTrackingApi({
  async start() {
    if (watchId !== null) {
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Erros de ingestão (AsyncStorage) não têm a quem ser mostrados aqui;
        // o próximo ponto tenta de novo.
        ingest([toLocationObject(position)]).catch(() => undefined);
      },
      // Sem sinal por um instante não encerra o watch; o navegador segue
      // tentando e o próximo ponto chega normalmente.
      undefined,
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  },
  async stop() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
  },
  async isRunning() {
    return watchId !== null;
  },
});
