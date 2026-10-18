import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { neutrals } from '../../constants/colors';
import { MAP_HTML, MAP_MESSAGE_SOURCE, MapPoint, routeCommand } from './mapHtml';

type RouteMapProps = {
  points: MapPoint[];
  live: boolean;
  height?: number;
};

// O baseUrl faz as requisições de tiles saírem com Referer -- a política de
// uso do tile.openstreetmap.org bloqueia clientes que não se identificam.
const BASE_URL = 'https://virapedal.app/';

export function RouteMap({ points, live, height = 260 }: RouteMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  // Só depois do "ready" da página: antes disso o Leaflet ainda está
  // carregando do CDN e o comando se perderia.
  useEffect(() => {
    if (!ready) {
      return;
    }
    const command = JSON.stringify(routeCommand(points, live));
    webViewRef.current?.injectJavaScript(`window.postMessage(${JSON.stringify(command)}, '*'); true;`);
  }, [ready, points, live]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.source === MAP_MESSAGE_SOURCE && data.type === 'ready') {
        setReady(true);
      }
    } catch {
      // Mensagem que não é nossa (nenhuma outra é esperada); ignorar.
    }
  }

  return (
    <View style={[styles.frame, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        // O mapa vive dentro do ScrollView do detalhe: sem isto, arrastar o
        // mapa no Android rola a tela em vez de mover o mapa.
        nestedScrollEnabled
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: neutrals.hairline,
  },
  webView: {
    flex: 1,
    backgroundColor: neutrals.hairline,
  },
});
