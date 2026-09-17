import { StyleSheet, Text, View } from 'react-native';
import { colors, neutrals } from '../constants/colors';
import {
  formatDayMonth,
  formatDistance,
  formatDuration,
  formatElapsed,
  formatTime,
  RouteListItem,
  routeTimestamp,
} from '../hooks/useRoutes';
import { PhotoStack } from './PhotoStack';
import { TrailNode } from './TrailNode';

type RouteRowProps = {
  route: RouteListItem;
  // A última linha da lista dispensa a divisória de baixo.
  isLast: boolean;
};

// Uma linha é texto à esquerda e a pilha de fotos à direita. Os números vêm
// como colunas separadas por espaço, não como uma frase com pontinhos --
// distância e tempo são duas leituras distintas, e assim se alinham entre
// linhas vizinhas.
export function RouteRow({ route, isLast }: RouteRowProps) {
  const live = route.status === 'active';
  const paused = route.status === 'paused';
  const inProgress = live || paused;

  const distance = formatDistance(route.distance_meters);
  // Tempo em movimento quando o GPS já existe; até lá, o de relógio.
  const time = formatDuration(route.duration_seconds) ?? formatElapsed(route.started_at, route.finished_at);

  // Rota em andamento não tem números fechados: a única coisa que importa
  // dizer é que ela está aberta, e desde quando.
  const stateLine = live
    ? route.started_at
      ? `gravando desde ${formatTime(route.started_at)}`
      : 'gravando'
    : paused
      ? route.started_at
        ? `pausada desde ${formatTime(route.started_at)}`
        : 'pausada'
      : null;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.body}>
        <View style={styles.titleLine}>
          {live ? (
            <View style={styles.liveMark}>
              <TrailNode variant="live" />
            </View>
          ) : null}
          <Text style={[styles.name, live && styles.nameLive]} numberOfLines={1}>
            {route.name ?? 'Rota sem nome'}
          </Text>
        </View>

        {inProgress ? (
          <Text style={[styles.state, live && styles.stateLive]}>{stateLine}</Text>
        ) : distance || time ? (
          <View style={styles.figures}>
            {distance ? <Text style={styles.figure}>{distance}</Text> : null}
            {time ? <Text style={styles.figure}>{time}</Text> : null}
          </View>
        ) : null}

        <View style={styles.meta}>
          <Text style={styles.metaText}>{formatDayMonth(routeTimestamp(route))}</Text>
          {route.event_title ? (
            <Text style={[styles.metaText, styles.metaEvent]} numberOfLines={1}>
              {route.event_title}
            </Text>
          ) : null}
        </View>
      </View>

      <PhotoStack paths={route.photo_paths} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutrals.hairline,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // O halo tem 20px de largura, mas o ponto em si é pequeno; compensa-se a
  // margem para o nome não parecer afastado do sinal.
  liveMark: {
    marginLeft: -6,
    marginRight: 2,
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
    color: neutrals.ink,
    letterSpacing: -0.2,
  },
  nameLive: {
    fontSize: 19,
  },
  figures: {
    flexDirection: 'row',
    gap: 14,
  },
  figure: {
    fontSize: 15,
    fontWeight: '500',
    color: neutrals.slate,
    fontVariant: ['tabular-nums'],
  },
  state: {
    fontSize: 14,
    color: neutrals.slate,
  },
  stateLive: {
    color: colors.primary,
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: neutrals.mute,
  },
  metaEvent: {
    flexShrink: 1,
  },
});
