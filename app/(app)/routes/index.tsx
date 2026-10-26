import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GhostRoute } from '../../../components/GhostRoute';
import { LoadingView } from '../../../components/LoadingView';
import { RouteRow } from '../../../components/RouteRow';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { StatusText } from '../../../components/StatusText';
import { colors } from '../../../constants/colors';
import { SCREEN_GUTTER, type } from '../../../constants/theme';
import { monthKey, monthLabel, RouteListItem, routeTimestamp, useRoutes } from '../../../hooks/useRoutes';

// Rotas em andamento encabeçam a lista sob "Agora"; as demais se agrupam
// por mês. Achatada em itens heterogêneos (e não SectionList) para que os
// rótulos de período sejam linhas comuns, sem cabeçalho fixo.
type ListItem =
  | { kind: 'period'; key: string; label: string; first: boolean }
  | { kind: 'route'; key: string; route: RouteListItem };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildItems(routes: RouteListItem[]): ListItem[] {
  const items: ListItem[] = [];

  // Uma gravação aberta não pertence a um mês fechado.
  const inProgress = routes.filter((route) => route.status !== 'finished');
  const finished = routes.filter((route) => route.status === 'finished');

  if (inProgress.length > 0) {
    items.push({ kind: 'period', key: 'period-now', label: 'Agora', first: true });
    inProgress.forEach((route) => items.push({ kind: 'route', key: `r${route.id}`, route }));
  }

  let lastKey: string | null = null;
  finished.forEach((route) => {
    const stamp = routeTimestamp(route);
    const key = monthKey(stamp);
    if (key !== lastKey) {
      items.push({ kind: 'period', key: `period-${key}`, label: capitalize(monthLabel(stamp)), first: items.length === 0 });
      lastKey = key;
    }
    items.push({ kind: 'route', key: `r${route.id}`, route });
  });

  return items;
}

export default function RoutesList() {
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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Minha atividade" />

      {loading ? (
        <LoadingView />
      ) : error ? (
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
              // Respiro maior acima do que abaixo, para que o rótulo pertença
              // ao grupo que abre e não ao que fecha.
              <Text style={[type.sectionLabel, styles.periodLabel, !item.first && styles.periodSpaced]}>{item.label}</Text>
            ) : (
              <Link href={`/routes/${item.route.id}`} asChild>
                <TouchableOpacity activeOpacity={0.8} style={styles.row}>
                  <RouteRow route={item.route} />
                </TouchableOpacity>
              </Link>
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <GhostRoute />
              <Text style={type.empty}>Nenhuma rota gravada ainda. Toque em Gravar para começar uma.</Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 24,
    flexGrow: 1,
  },
  periodLabel: {
    marginBottom: 10,
  },
  periodSpaced: {
    marginTop: 12,
  },
  row: {
    marginBottom: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    alignItems: 'center',
    gap: 9,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
});
