import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ingest } from './core';

export const ROUTE_TRACKING_TASK = 'virapedal-route-tracking';

// defineTask precisa rodar no carregamento do bundle (por isso o import em
// app/_layout.tsx): quando o SO acorda o app em segundo plano para entregar
// localizações, a task tem que existir antes de qualquer tela montar.
TaskManager.defineTask<{ locations: LocationObject[] }>(ROUTE_TRACKING_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) {
    // Erros da task são transitórios (GPS indisponível por um momento); o
    // próximo lote chega sozinho, não há o que fazer com este.
    return;
  }
  await ingest(data.locations);
});
