import * as Location from 'expo-location';
import { createTrackingApi } from './api';
import { ingest } from './core';

export { flushQueue, getQueuedPoints, totalsToColumns } from './core';
export type { TrackedPoint, TrackingSession, TrackingTotals } from './core';
export { subscribeTracking } from './emitter';

// Na web a gravação só acontece com a aba aberta (geolocalização do
// navegador). Serve para desenvolver e testar o fluxo de ponta a ponta; o uso
// real num pedal é pelo app no celular.
let subscription: Location.LocationSubscription | null = null;

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
    if (subscription) {
      return;
    }
    subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      (location) => {
        // Erros de ingestão (AsyncStorage) não têm a quem ser mostrados aqui;
        // o próximo ponto tenta de novo.
        ingest([location]).catch(() => undefined);
      }
    );
  },
  async stop() {
    subscription?.remove();
    subscription = null;
  },
  async isRunning() {
    return subscription !== null;
  },
});
