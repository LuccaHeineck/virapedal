import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LoadingView } from '../../../components/LoadingView';
import { RouteRow } from '../../../components/RouteRow';
import { StatusText } from '../../../components/StatusText';
import { TrailNode } from '../../../components/TrailNode';
import { colors, neutrals, palette } from '../../../constants/colors';
import { cardShadow, fonts, SCREEN_GUTTER } from '../../../constants/theme';
import { monthKey, monthLabel, RouteListItem, routeTimestamp, useRoutes } from '../../../hooks/useRoutes';

// Rotas em andamento encabeçam a lista sob "agora"; as demais se agrupam
// por mês. Achatada em itens heterogêneos (e não SectionList) para que os
// rótulos de período sejam linhas comuns, sem cabeçalho fixo.
type ListItem =
  | { kind: 'period'; key: string; label: string }
  | { kind: 'route'; key: string; route: RouteListItem; isLast: boolean };

function buildItems(routes: RouteListItem[]): ListItem[] {
  const items: ListItem[] = [];

  // Uma gravação aberta não pertence a um mês fechado.
  const inProgress = routes.filter((route) => route.status !== 'finished');
  const finished = routes.filter((route) => route.status === 'finished');

  if (inProgress.length > 0) {
    items.push({ kind: 'period', key: 'period-now', label: 'agora' });
    inProgress.forEach((route) => items.push({ kind: 'route', key: `r${route.id}`, route, isLast: false }));
  }

  let lastKey: string | null = null;
  finished.forEach((route) => {
    const stamp = routeTimestamp(route);
    const key = monthKey(stamp);
    if (key !== lastKey) {
      items.push({ kind: 'period', key: `period-${key}`, label: monthLabel(stamp) });
      lastKey = key;
    }
    items.push({ kind: 'route', key: `r${route.id}`, route, isLast: false });
  });

  // A última rota da lista dispensa a divisória de baixo.
  const last = items[items.length - 1];
  if (last && last.kind === 'route') {
    last.isLast = true;
  }

  return items;
}

export default function RoutesList() {
  const router = useRouter();
  const { routes, loading, error, refresh } = useRoutes();

  // useRoutes() só busca no mount -- sem isto, voltar para cá depois de
  // iniciar uma rota ou mudar seu status em outra tela (a instância da pilha
  // permanece montada) mostraria a lista desatualizada.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const items = useMemo(() => buildItems(routes), [routes]);

  if (loading) {
    return <LoadingView />;
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            item.kind === 'period' ? (
              <Text style={styles.periodLabel}>{item.label}</Text>
            ) : (
              <Link href={`/routes/${item.route.id}`} asChild>
                <TouchableOpacity activeOpacity={0.8}>
                  <RouteRow route={item.route} isLast={item.isLast} />
                </TouchableOpacity>
              </Link>
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyTrail}>
                <View style={[styles.emptyDash, { opacity: 0.25 }]} />
                <View style={[styles.emptyDash, { opacity: 0.5 }]} />
                <View style={[styles.emptyDash, { opacity: 0.8 }]} />
                <TrailNode variant="past" />
              </View>
              <Text style={styles.emptyTitle}>Sua primeira rota começa aqui.</Text>
              <Text style={styles.emptyHint}>Toque em + para começar a gravar.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/routes/new')}
        accessibilityLabel="Iniciar rota"
        accessibilityRole="button">
        <Ionicons name="add" size={28} color={palette.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: 2,
    paddingBottom: 96,
    flexGrow: 1,
  },
  // Rótulo de período: um respiro maior acima do que abaixo, para que ele
  // pertença ao grupo que abre e não ao que fecha.
  periodLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: palette.ink,
    opacity: 0.7,
    paddingTop: 22,
    paddingBottom: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyTrail: {
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyDash: {
    width: 1,
    height: 10,
    marginBottom: 5,
    backgroundColor: neutrals.mute,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: neutrals.ink,
  },
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: neutrals.mute,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: SCREEN_GUTTER,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra quente e curta, no mesmo tom da cardShadow, só que mais
    // presente: o botão flutua sobre a lista.
    ...cardShadow,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
