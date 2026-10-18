// Na web não há task em segundo plano: a gravação usa watchPosition enquanto
// a aba está aberta (ver index.web.ts). O arquivo existe só para o import em
// app/_layout.tsx resolver nas duas plataformas.
export const ROUTE_TRACKING_TASK = 'virapedal-route-tracking';
