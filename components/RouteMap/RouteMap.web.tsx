import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { neutrals } from '../../constants/colors';
import { MAP_HTML, MAP_MESSAGE_SOURCE, MapPoint, routeCommand } from './mapHtml';

type RouteMapProps = {
  points: MapPoint[];
  live: boolean;
  height?: number;
};

// Versão web do RouteMap: a mesma página do Leaflet num iframe (o
// react-native-webview não roda no navegador), conversando por postMessage.
export function RouteMap({ points, live, height = 260 }: RouteMapProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data?.source === MAP_MESSAGE_SOURCE && data.type === 'ready') {
          setReady(true);
        }
      } catch {
        // Mensagem que não é nossa; ignorar.
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(routeCommand(points, live)), '*');
  }, [ready, points, live]);

  return (
    <View style={[styles.frame, { height }]}>
      {createElement('iframe', {
        ref: iframeRef,
        srcDoc: MAP_HTML,
        title: 'Mapa da rota',
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: neutrals.hairline,
  },
});
