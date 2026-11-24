import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { EventRow } from '../../../components/EventRow';
import { LoadingView } from '../../../components/LoadingView';
import { RouteRow } from '../../../components/RouteRow';
import { IconButton, ScreenHeader } from '../../../components/ScreenHeader';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { StatusText } from '../../../components/StatusText';
import { colors, palette } from '../../../constants/colors';
import { cardShadow, fonts, radii, SCREEN_GUTTER, type } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
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
  | { kind: 'route'; key: string; route: RouteListItem };

export default function Profile() {
  const router = useRouter();
  const { user } = useAuth();
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

  const header = (
    <ScreenHeader
      title="Perfil"
      topPadding={32}
      actions={
        <IconButton icon="settings-outline" onPress={() => router.push('/profile/settings')} accessibilityLabel="Configurações do perfil" />
      }
    />
  );

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        {header}
        <LoadingView />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <StatusText variant="error">{error ?? 'Não foi possível carregar seu perfil. Tente novamente.'}</StatusText>
        </View>
      </View>
    );
  }

  const items: ListItem[] =
    tab === 'group'
      ? myEvents.map((event) => ({ kind: 'event', key: `e${event.id}`, event }))
      : routes.map((route) => ({ kind: 'route', key: `r${route.id}`, route }));

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
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) =>
        item.kind === 'event' ? (
          <Link href={`/groups/${item.event.group_id}/events/${item.event.id}?from=profile`} asChild>
            <TouchableOpacity style={styles.row} activeOpacity={0.8}>
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
            <TouchableOpacity style={styles.row} activeOpacity={0.8}>
              <RouteRow route={item.route} />
            </TouchableOpacity>
          </Link>
        )
      }
      ListHeaderComponent={
        <>
          {header}
          <View style={styles.header}>
            <View style={styles.identity}>
              <Avatar photo={profile.profile_photo_url} name={profile.name} size={88} />
              <Text style={styles.name} numberOfLines={2}>
                {profile.name}
              </Text>
              {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
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

            <SegmentedControl options={TABS} active={tab} onChange={setTab} />

            {listError ? <StatusText variant="error">{listError}</StatusText> : null}
          </View>
        </>
      }
      ListEmptyComponent={
        listLoading ? null : (
          <View style={styles.centered}>
            <Text style={type.empty}>{emptyText}</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 16,
    gap: 20,
  },
  identity: {
    alignItems: 'center',
    gap: 6,
  },
  name: {
    marginTop: 6,
    fontFamily: fonts.display,
    fontSize: 17,
    color: palette.ink,
    textAlign: 'center',
  },
  email: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.ink,
    opacity: 0.6,
  },
  // Faixa de números: valor em destaque, rótulo pequeno embaixo, colunas
  // iguais separadas por filetes, num card como os demais.
  stats: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: radii.card,
    backgroundColor: palette.surface,
    ...cardShadow,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  statValue: {
    fontFamily: fonts.displayHeavy,
    fontSize: 20,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: palette.inkSecondary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: palette.ink,
    opacity: 0.6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  separator: {
    height: 10,
  },
  row: {
    paddingHorizontal: SCREEN_GUTTER,
  },
});
