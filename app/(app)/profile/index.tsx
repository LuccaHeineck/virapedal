import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { EventRow } from '../../../components/EventRow';
import { RouteRow } from '../../../components/RouteRow';
import { StatusText } from '../../../components/StatusText';
import { UnderlineTabs } from '../../../components/UnderlineTabs';
import { colors, neutrals } from '../../../constants/colors';
import { MyEventParticipation, useMyEventParticipations } from '../../../hooks/useMyEventParticipations';
import { useProfile } from '../../../hooks/useProfile';
import { RouteListItem, useRoutes } from '../../../hooks/useRoutes';

type RideTotals = { distanceMeters: number; seconds: number };

// Soma só rotas finalizadas: uma gravação aberta ainda não tem números
// fechados. O tempo prefere duration_seconds (em movimento, vindo do GPS) e,
// enquanto o GPS não existe, cai no tempo de relógio entre início e fim.
function sumRides(routes: RouteListItem[]): RideTotals {
  return routes.reduce<RideTotals>(
    (totals, route) => {
      if (route.status !== 'finished') {
        return totals;
      }
      const distance = Number(route.distance_meters);
      const moving = Number(route.duration_seconds);
      let seconds = Number.isFinite(moving) && moving > 0 ? moving : 0;
      if (seconds === 0 && route.started_at && route.finished_at) {
        const ms = new Date(route.finished_at).getTime() - new Date(route.started_at).getTime();
        seconds = Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0;
      }
      return {
        distanceMeters: totals.distanceMeters + (Number.isFinite(distance) && distance > 0 ? distance : 0),
        seconds: totals.seconds + seconds,
      };
    },
    { distanceMeters: 0, seconds: 0 }
  );
}

// Número e unidade separados para que o número possa ter destaque próprio.
function totalDistance(meters: number): { value: string; unit: string } {
  const km = meters / 1000;
  return { value: km.toFixed(km >= 100 ? 0 : 1).replace('.', ','), unit: 'km' };
}

function totalTime(seconds: number): { value: string; unit: string } {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return { value: String(minutes), unit: 'min' };
  }
  const hours = minutes / 60;
  return { value: hours.toFixed(hours >= 10 ? 0 : 1).replace('.', ','), unit: 'h' };
}

type ProfileTab = 'group' | 'rides';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'rides', label: 'Meus pedais' },
  { key: 'group', label: 'Pedais em grupo' },
];

// As duas abas dividem uma única FlatList (o cabeçalho com foto e nome rola
// junto), então os itens são heterogêneos e o renderItem decide pelo kind.
type ListItem =
  | { kind: 'event'; key: string; event: MyEventParticipation }
  | { kind: 'route'; key: string; route: RouteListItem; isLast: boolean };

export default function Profile() {
  const [tab, setTab] = useState<ProfileTab>('rides');
  const [refreshing, setRefreshing] = useState(false);
  const { profile, loading, error, refresh: refreshProfile } = useProfile();

  const { events: myEvents, loading: myEventsLoading, error: myEventsError, refresh: refreshMyEvents } = useMyEventParticipations();

  // Todas as gravações do usuário, vinculadas a um pedal em grupo ou não.
  const { routes, loading: routesLoading, error: routesError, refresh: refreshRoutes } = useRoutes();

  // Também recarrega o perfil: nome e foto podem ter mudado em Configurações.
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      refreshMyEvents();
      refreshRoutes();
    }, [refreshProfile, refreshMyEvents, refreshRoutes])
  );

  // Estado próprio para o "puxar para atualizar": usar o loading dos hooks
  // faria o indicador aparecer também a cada volta de foco para a aba.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), refreshMyEvents(), refreshRoutes()]);
    setRefreshing(false);
  }, [refreshProfile, refreshMyEvents, refreshRoutes]);

  const totals = useMemo(() => sumRides(routes), [routes]);

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? 'Não foi possível carregar seu perfil. Tente novamente.'}</Text>
      </View>
    );
  }

  const items: ListItem[] =
    tab === 'group'
      ? myEvents.map((event) => ({ kind: 'event', key: `e${event.id}`, event }))
      : routes.map((route, index) => ({
          kind: 'route',
          key: `r${route.id}`,
          route,
          isLast: index === routes.length - 1,
        }));

  const listError = tab === 'group' ? myEventsError : routesError;
  const listLoading = tab === 'group' ? myEventsLoading : routesLoading;
  const emptyText =
    tab === 'group' ? 'Você ainda não participa de nenhum pedal em grupo.' : 'Você ainda não registrou nenhum pedal.';

  // A distância só aparece quando existe: sem GPS ela é sempre zero, e um
  // "0 km" fixo no perfil parece erro. Entra sozinha quando a gravação chegar.
  const stats: { key: string; value: string; unit?: string; label: string }[] = [
    { key: 'group', value: String(myEvents.length), label: 'Em grupo' },
    { key: 'rides', value: String(routes.length), label: routes.length === 1 ? 'Pedal' : 'Pedais' },
    ...(totals.distanceMeters > 0 ? [{ key: 'km', ...totalDistance(totals.distanceMeters), label: 'Pedalados' }] : []),
    { key: 'time', ...totalTime(totals.seconds), label: 'Pedalando' },
  ];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={(item) => item.key}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
      // RouteRow já desenha a própria divisória.
      ItemSeparatorComponent={tab === 'group' ? () => <View style={styles.separator} /> : undefined}
      renderItem={({ item }) =>
        item.kind === 'event' ? (
          <Link href={`/groups/${item.event.group_id}/events/${item.event.id}?from=profile`} asChild>
            <TouchableOpacity style={styles.row}>
              <EventRow
                title={item.event.title}
                status={item.event.status}
                eventDate={item.event.event_date}
                startTime={item.event.start_time}
                meetingPoint={item.event.meeting_point}
                groupName={item.event.group_name}
                groupImagePath={item.event.group_image_url}
              />
            </TouchableOpacity>
          </Link>
        ) : (
          <Link href={`/routes/${item.route.id}?from=profile`} asChild>
            <TouchableOpacity style={styles.row} activeOpacity={0.6}>
              <RouteRow route={item.route} isLast={item.isLast} />
            </TouchableOpacity>
          </Link>
        )
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.identity}>
            <Avatar photo={profile.profile_photo_url} name={profile.name} size={80} />
            <Text style={styles.name} numberOfLines={2}>
              {profile.name}
            </Text>
          </View>

          <View style={styles.stats}>
            {stats.map((stat, index) => (
              <View key={stat.key} style={[styles.stat, index > 0 && styles.statDivided]}>
                <Text style={styles.statValue}>
                  {stat.value}
                  {stat.unit ? <Text style={styles.statUnit}> {stat.unit}</Text> : null}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <UnderlineTabs tabs={TABS} active={tab} onChange={setTab} style={styles.tabs} />

          {listError ? <StatusText variant="error">{listError}</StatusText> : null}
        </View>
      }
      ListEmptyComponent={
        listLoading ? null : (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    padding: 24,
    paddingBottom: 8,
    gap: 12,
    alignItems: 'stretch',
  },
  // Foto à esquerda e nome à direita, como nos perfis de redes sociais.
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  name: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
  },
  // Faixa de números estilo rede social: valor em destaque, rótulo pequeno
  // embaixo, colunas iguais separadas por filetes.
  stats: {
    flexDirection: 'row',
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: neutrals.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: neutrals.hairline,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: neutrals.hairline,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: neutrals.ink,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: neutrals.slate,
  },
  statLabel: {
    fontSize: 12,
    color: neutrals.mute,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  error: {
    color: '#c0392b',
  },
  tabs: {
    marginTop: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
  },
  row: {
    paddingHorizontal: 24,
  },
});
