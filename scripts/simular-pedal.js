// Simulador de pedal para a versão web do Virapedal.
//
// Substitui o GPS do navegador por um trajeto de exemplo (uma volta em torno
// do Parque Ibirapuera, ~4 km), para testar a gravação de rotas e o mapa sem
// sair de casa.
//
// Como usar (Chrome ou Firefox):
//   1. Abra o app (http://localhost:8081).
//   2. Abra o DevTools (F12) > aba Console, cole este arquivo inteiro e Enter.
//   3. No app: aba Rotas > + > Iniciar rota. O trajeto começa a ser percorrido.
//   4. Quando o Console avisar que o pedal chegou ao fim, toque em Finalizar.
//
// Pausar/Retomar no app funciona: o trajeto continua de onde parou.
// Para desligar o simulador: pararPedalSimulado() no Console, ou recarregue a
// página (o GPS real volta).
(() => {
  // --- Ajustes ---------------------------------------------------------------
  const SPEED_MS = 6; // velocidade simulada da bike, em m/s (~22 km/h)
  const STEP_METERS = 20; // distância entre um ponto e o próximo
  const REAL_INTERVAL_MS = 400; // de quanto em quanto tempo (de verdade) sai um ponto

  // Volta aproximada no entorno do Ibirapuera (lat, lng). Troque por outros
  // pontos para simular outro percurso.
  const WAYPOINTS = [
    [-23.5874, -46.6576],
    [-23.5851, -46.6602],
    [-23.5826, -46.662],
    [-23.581, -46.6585],
    [-23.5818, -46.6556],
    [-23.583, -46.653],
    [-23.5856, -46.6512],
    [-23.588, -46.6505],
    [-23.5904, -46.6519],
    [-23.5925, -46.654],
    [-23.5928, -46.6572],
    [-23.592, -46.66],
    [-23.5898, -46.6593],
    [-23.5874, -46.6576],
  ];

  // --- Trajeto interpolado ---------------------------------------------------
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  function distance([lat1, lng1], [lat2, lng2]) {
    const a =
      Math.sin(rad(lat2 - lat1) / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  const points = [];
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const from = WAYPOINTS[i];
    const to = WAYPOINTS[i + 1];
    const steps = Math.max(1, Math.round(distance(from, to) / STEP_METERS));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
    }
  }
  points.push(WAYPOINTS[WAYPOINTS.length - 1]);

  const total = points.length;
  const totalKm = points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0) / 1000;

  // Altitude com duas subidas ao longo da volta (o app ignora oscilações
  // menores que 4 m, então a variação precisa ser de verdade).
  const altitudeAt = (i) => 745 + 12 * Math.sin((i / total) * Math.PI * 4);

  // --- GPS falso -------------------------------------------------------------
  const original = {
    getCurrentPosition: navigator.geolocation.getCurrentPosition.bind(navigator.geolocation),
    watchPosition: navigator.geolocation.watchPosition.bind(navigator.geolocation),
    clearWatch: navigator.geolocation.clearWatch.bind(navigator.geolocation),
    query: navigator.permissions.query.bind(navigator.permissions),
  };

  let index = 0;
  // Relógio simulado: cada ponto avança o tempo que a bike levaria para
  // percorrer STEP_METERS, para a velocidade calculada pelo app ser realista.
  let clock = Date.now();
  let nextWatchId = 0;
  const timers = new Map();

  function position(i) {
    const [latitude, longitude] = points[Math.min(i, total - 1)];
    return {
      coords: {
        latitude,
        longitude,
        altitude: altitudeAt(i),
        accuracy: 5,
        altitudeAccuracy: 5,
        heading: null,
        speed: SPEED_MS,
      },
      timestamp: clock,
    };
  }

  navigator.permissions.query = (descriptor) =>
    descriptor && descriptor.name === 'geolocation'
      ? Promise.resolve({ state: 'granted', onchange: null })
      : original.query(descriptor);

  navigator.geolocation.getCurrentPosition = (success) => {
    setTimeout(() => success(position(index)), 50);
  };

  navigator.geolocation.watchPosition = (success) => {
    const id = ++nextWatchId;
    console.log(`%c[pedal simulado] gravando (watch ${id}) — ponto ${index}/${total}`, 'color:#c33e00');
    const timer = setInterval(() => {
      if (index >= total) {
        clearInterval(timer);
        console.log('%c[pedal simulado] chegou ao fim do trajeto. Toque em Finalizar no app.', 'color:#235b28;font-weight:bold');
        return;
      }
      clock = Math.max(clock + (STEP_METERS / SPEED_MS) * 1000, Date.now());
      success(position(index));
      index++;
      if (index % 25 === 0) {
        console.log(`[pedal simulado] ${index}/${total} pontos`);
      }
    }, REAL_INTERVAL_MS);
    timers.set(id, timer);
    return id;
  };

  navigator.geolocation.clearWatch = (id) => {
    clearInterval(timers.get(id));
    timers.delete(id);
  };

  window.pararPedalSimulado = () => {
    timers.forEach((timer) => clearInterval(timer));
    timers.clear();
    Object.assign(navigator.geolocation, {
      getCurrentPosition: original.getCurrentPosition,
      watchPosition: original.watchPosition,
      clearWatch: original.clearWatch,
    });
    navigator.permissions.query = original.query;
    console.log('[pedal simulado] desligado; o GPS real voltou.');
  };

  const seconds = Math.round((total * REAL_INTERVAL_MS) / 1000);
  console.log(
    `%c[pedal simulado] pronto: ${total} pontos, ~${totalKm.toFixed(1)} km, ~${seconds}s para percorrer. ` +
      'Agora, no app: aba Rotas > + > Iniciar rota.',
    'color:#c33e00;font-weight:bold'
  );
})();
