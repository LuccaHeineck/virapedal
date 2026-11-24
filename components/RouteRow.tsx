import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { cardShadow, fonts, radii } from '../constants/theme';
import {
  formatDayMonth,
  formatDistance,
  formatDuration,
  formatElapsed,
  formatElevation,
  formatTime,
  RouteListItem,
  routeTimestamp,
} from '../hooks/useRoutes';
import { PHOTO_STACK_SIZE, PhotoStack } from './PhotoStack';
import { Squiggle } from './Squiggle';
import { TrailNode } from './TrailNode';

type RouteRowProps = {
  route: RouteListItem;
};

// Card de rota gravada: números em Sora no topo ("12,4 km · 48 min"), nome e
// data embaixo, e a pilha de fotos à direita. Sem fotos, um mini traçado em
// terracota ocupa o lugar, como no design.
export function RouteRow({ route }: RouteRowProps) {
  const live = route.status === 'active';
  const paused = route.status === 'paused';
  const inProgress = live || paused;

  const distance = formatDistance(route.distance_meters);
  // Só quando houve subida de fato: "↑ 0 m" num card de lista é ruído.
  const climb = Number(route.elevation_gain_meters) > 0 ? formatElevation(route.elevation_gain_meters) : null;
  // Tempo em movimento quando o GPS já existe; até lá, o de relógio.
  const time = formatDuration(route.duration_seconds) ?? formatElapsed(route.started_at, route.finished_at);

  // Rota em andamento não tem números fechados: a única coisa que importa
  // dizer é que ela está aberta, e desde quando.
  const stateLine = live
    ? route.started_at
      ? `Gravando desde ${formatTime(route.started_at)}`
      : 'Gravando'
    : paused
      ? route.started_at
        ? `Pausada desde ${formatTime(route.started_at)}`
        : 'Pausada'
      : null;

  const figures = [distance, time, climb ? `↑ ${climb}` : null].filter(Boolean).join(' · ');
  const subtitle = [route.name ?? 'Rota sem nome', route.event_title, formatDayMonth(routeTimestamp(route))]
    .filter(Boolean)
    .join(' · ');
  const hasPhotos = route.photo_paths.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        {inProgress ? (
          <View style={styles.titleLine}>
            {live ? (
              <View style={styles.liveMark}>
                <TrailNode variant="live" />
              </View>
            ) : null}
            <Text style={[styles.headline, live && styles.headlineLive]} numberOfLines={1}>
              {stateLine}
            </Text>
          </View>
        ) : (
          <Text style={styles.headline} numberOfLines={1}>
            {figures || 'Sem dados de GPS'}
          </Text>
        )}

        <Text style={styles.meta} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* Espaço fixo do tamanho da pilha de fotos, com ou sem foto: assim
          todos os cards da lista têm a mesma altura. */}
      <View style={styles.aside}>{hasPhotos ? <PhotoStack paths={route.photo_paths} /> : <MiniRoute />}</View>
    </View>
  );
}

// Traçado decorativo 40×24 em zigue-zague.
const MINI_POINTS: [number, number][] = [
  [1, 18],
  [9, 9],
  [16, 15],
  [24, 4],
  [32, 12],
  [39, 6],
];

function MiniRoute() {
  return <Squiggle points={MINI_POINTS} width={40} height={24} style={styles.mini} />;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: palette.surface,
    ...cardShadow,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // O halo tem 20px de largura, mas o ponto em si é pequeno; compensa-se a
  // margem para o texto não parecer afastado do sinal.
  liveMark: {
    marginLeft: -6,
    marginRight: 2,
  },
  headline: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 14.5,
    color: palette.ink,
    marginBottom: 3,
    fontVariant: ['tabular-nums'],
  },
  headlineLive: {
    color: palette.primary,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: palette.ink,
    opacity: 0.6,
  },
  aside: {
    width: PHOTO_STACK_SIZE,
    height: PHOTO_STACK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mini: {
    opacity: 0.6,
  },
});
