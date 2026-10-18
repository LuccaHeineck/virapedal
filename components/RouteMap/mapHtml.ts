import { colors, neutrals } from '../../constants/colors';

export type MapPoint = { latitude: number; longitude: number };

// Mensagens trocadas entre o app e a página do mapa. `source` distingue as
// nossas de qualquer outro postMessage que circule na janela (na web o iframe
// divide a janela com o resto do app).
export const MAP_MESSAGE_SOURCE = 'virapedal-map';

export type MapCommand = { source: typeof MAP_MESSAGE_SOURCE; type: 'route'; points: [number, number][]; live: boolean };

export function routeCommand(points: MapPoint[], live: boolean): MapCommand {
  return {
    source: MAP_MESSAGE_SOURCE,
    type: 'route',
    // Pares [lat, lng] com 6 casas (~10 cm): metade do tamanho do JSON de
    // objetos, o que importa quando 2h de pedal são ~1500 pontos por mensagem.
    points: points.map((point) => [Number(point.latitude.toFixed(6)), Number(point.longitude.toFixed(6))]),
    live,
  };
}

// Página única com Leaflet + tiles do OpenStreetMap, usada pelo WebView no
// celular e por um iframe na web. A linha segue o significado do azul nas
// Rotas (constants/colors.ts): azul enquanto grava, tinta depois de pronta.
// Os marcadores repetem o TrailNode: início vazado, fim cheio.
export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; background: ${neutrals.hairline}; }
  .leaflet-control-attribution { font-size: 10px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
<script>
  var LIVE = '${colors.primary}';
  var DONE = '${neutrals.ink}';
  var SOURCE = '${MAP_MESSAGE_SOURCE}';

  var map = L.map('map', { zoomControl: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  // Porto Alegre até o primeiro ponto chegar.
  map.setView([-30.0346, -51.2177], 12);

  var line = L.polyline([], { weight: 4, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(map);
  var start = null;
  var end = null;
  var fitted = false;
  // Enquanto grava, o mapa acompanha a posição atual -- até a pessoa arrastar
  // o mapa para olhar outro trecho; aí ele para de puxar a vista de volta.
  var follow = true;
  map.on('dragstart', function () { follow = false; });

  function marker(latlng, color, filled) {
    return L.circleMarker(latlng, {
      radius: 6, weight: 2.5, color: filled ? '#fff' : color,
      fillColor: filled ? color : '#fff', fillOpacity: 1
    }).addTo(map);
  }

  function setRoute(points, live) {
    var color = live ? LIVE : DONE;
    line.setLatLngs(points);
    line.setStyle({ color: color });
    if (start) { map.removeLayer(start); start = null; }
    if (end) { map.removeLayer(end); end = null; }
    if (!points.length) { return; }

    start = marker(points[0], color, false);
    if (points.length > 1) { end = marker(points[points.length - 1], color, true); }

    if (!fitted) {
      fitted = true;
      if (points.length === 1) { map.setView(points[0], 16); }
      else { map.fitBounds(line.getBounds(), { padding: [24, 24] }); }
    } else if (live && follow) {
      map.panTo(points[points.length - 1]);
    }
  }

  function onMessage(event) {
    var data = event.data;
    try { if (typeof data === 'string') { data = JSON.parse(data); } } catch (e) { return; }
    if (data && data.source === SOURCE && data.type === 'route') { setRoute(data.points, data.live); }
  }
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);

  var ready = JSON.stringify({ source: SOURCE, type: 'ready' });
  if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(ready); }
  else if (window.parent !== window) { window.parent.postMessage(ready, '*'); }
</script>
</body>
</html>`;
