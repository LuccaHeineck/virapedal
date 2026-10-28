import { StyleSheet, Text, View } from 'react-native';
import type { EventBaseRoute as BaseRoute } from '../hooks/useEventBaseRoute';
import { useRoutePoints } from '../hooks/useRoutePoints';
import { formatDistance, formatDuration, formatElevation } from '../hooks/useRoutes';
import { RouteMap } from './RouteMap/RouteMap';

type EventBaseRouteProps = {
  route: BaseRoute;
};

// O percurso que o pedal de fato fez, na tela do pedal: mapa e números da
// rota base (ver event_base_route no banco). A rota já está finalizada, então
// os pontos são lidos uma vez, sem acompanhamento ao vivo.
export function EventBaseRoute({ route }: EventBaseRouteProps) {
  const { points } = useRoutePoints(route.id, { live: false, isOwner: false });

  const distance = formatDistance(route.distance_meters);
  const time = formatDuration(route.duration_seconds);
  const climb = Number(route.elevation_gain_meters) > 0 ? formatElevation(route.elevation_gain_meters) : null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Percurso do pedal</Text>

      {points.length > 0 ? <RouteMap points={points} live={false} height={220} /> : null}

      <View style={styles.figures}>
        {distance ? <Figure label="distância" value={distance} /> : null}
        {time ? <Figure label="em movimento" value={time} /> : null}
        {climb ? <Figure label="subida" value={climb} /> : null}
      </View>

      {route.recorder_name ? <Text style={styles.caption}>Traçado gravado por {route.recorder_name}</Text> : null}
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureValue}>{value}</Text>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginTop: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  figures: {
    flexDirection: 'row',
    gap: 24,
  },
  figure: {
    gap: 2,
  },
  figureValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    fontVariant: ['tabular-nums'],
  },
  figureLabel: {
    fontSize: 12,
    color: '#666',
  },
  caption: {
    fontSize: 13,
    color: '#666',
  },
});
