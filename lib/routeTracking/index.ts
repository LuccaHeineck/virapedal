import * as Location from 'expo-location';
import { colors } from '../../constants/colors';
import { createTrackingApi } from './api';
import { ROUTE_TRACKING_TASK } from './task';

export { flushQueue, getQueuedPoints, totalsToColumns } from './core';
export type { TrackedPoint, TrackingSession, TrackingTotals } from './core';
export { subscribeTracking } from './emitter';

async function isRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(ROUTE_TRACKING_TASK);
  } catch {
    // Lança quando a task nunca foi registrada neste aparelho -- o mesmo que
    // "não está gravando".
    return false;
  }
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
    if (await isRunning()) {
      return;
    }
    // ~5s entre pontos, desde que tenha andado 10m: parado no semáforo não
    // gera ponto nenhum. O foreground service é o que mantém o Android
    // entregando localizações com a tela apagada (e a notificação fixa é a
    // exigência do sistema para isso).
    await Location.startLocationUpdatesAsync(ROUTE_TRACKING_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 10,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Virapedal',
        notificationBody: 'Gravando sua rota',
        notificationColor: colors.primary,
      },
    });
  },
  async stop() {
    if (await isRunning()) {
      await Location.stopLocationUpdatesAsync(ROUTE_TRACKING_TASK);
    }
  },
  isRunning,
});
