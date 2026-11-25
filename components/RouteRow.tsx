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
import { PhotoStack } from './PhotoStack';
import { TrailNode } from './TrailNode';

type RouteRowProps = {
  route: RouteListItem;
  // O último card da lista dispensa o respiro de baixo.
  isLast: boolean;
};

// Um card é texto à esquerda e a pilha de fotos à direita. Os números vêm
// como colunas separadas por espaço, não como uma frase com pontinhos --
// distância e tempo são duas leituras distintas, e assim se alinham entre
// cards vizinhos.
export function RouteRow({ route, isLast }: RouteRowProps) {
  const live = route.status === 'active';
  const paused = route.status === 'paused';
  const inProgress = live || paused;

  const distance = formatDistance(route.distance_meters);
  // Só quando houve subida de fato: "↑ 0 m" numa linha de lista é ruído.
  const climb = Number(route.elevation_gain_meters) > 0 ? formatElevation(route.elevation_gain_meters) : null;
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
    <View style={[styles.card, !isLast && styles.cardSpaced]}>
      <View style={styles.body}>
        <View style={styles.titleLine}>
          {live ? (
            <View style={styles.liveMark}>
              <TrailNode variant="live" />
            </View>
          ) : null}
          <Text style={styles.name} numberOfLines={1}>
            {route.name ?? 'Rota sem nome'}
          </Text>
        </View>

        {inProgress ? (
          <Text style={[styles.state, live && styles.stateLive]}>{stateLine}</Text>
        ) : distance || time ? (
          <View style={styles.figures}>
            {distance ? <Text style={styles.figure}>{distance}</Text> : null}
            {time ? <Text style={styles.figure}>{time}</Text> : null}
            {climb ? <Text style={styles.figure}>↑ {climb}</Text> : null}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: palette.surface,
    ...cardShadow,
  },
  cardSpaced: {
    marginBottom: 10,
  },
  body: {
    flex: 1,
    minWidth: 0,
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
  // Tamanhos alinhados ao EventRow: as duas listas aparecem lado a lado nas
  // abas do Perfil e não devem parecer componentes de apps diferentes. A
  // rota ao vivo já se destaca pelo ponto terracota, sem precisar de fonte maior.
  name: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 14.5,
    color: palette.ink,
  },
  figures: {
    flexDirection: 'row',
    gap: 14,
  },
  figure: {
    fontFamily: fonts.displaySemi,
    fontSize: 13,
    color: palette.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  state: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkSecondary,
  },
  stateLive: {
    fontFamily: fonts.bodySemi,
    color: palette.primary,
  },
  meta: {
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: palette.inkInactive,
  },
  metaEvent: {
    flexShrink: 1,
  },
});
