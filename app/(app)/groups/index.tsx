import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GroupCard } from '../../../components/GroupCard';
import { LoadingView } from '../../../components/LoadingView';
import { PrivateGroupCard } from '../../../components/PrivateGroupCard';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { UnderlineTabs } from '../../../components/UnderlineTabs';
import { colors } from '../../../constants/colors';
import { Group, PrivateGroupPreview, useGroups } from '../../../hooks/useGroups';

type Tab = 'mine' | 'discover';

// "Descobrir" mistura grupos públicos (card completo, abre a tela do grupo)
// com privados visíveis (só nome, admins e o pedido de entrada).
type ListItem =
  | { kind: 'group'; key: string; group: Group; createdAt: string }
  | { kind: 'private'; key: string; group: PrivateGroupPreview; createdAt: string };

const TABS: { key: Tab; label: string }[] = [
  { key: 'mine', label: 'Meus grupos' },
  { key: 'discover', label: 'Descobrir' },
];

export default function GroupsList() {
  const { myGroups, discoverGroups, privateDiscoverGroups, adminGroupIds, pendingRequestCounts, loading, error, refresh } =
    useGroups();
  const [tab, setTab] = useState<Tab>('mine');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Estado próprio para o "puxar para atualizar" (mesmo esquema do Perfil):
  // o indicador só aparece quando o gesto foi feito, não a cada volta de foco.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // useGroups() só busca no mount — sem isso, voltar para esta tela depois
  // de criar/entrar/sair de um grupo em outra tela (a instância da pilha
  // permanece montada) continuaria mostrando a lista desatualizada.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const myItems = useMemo<ListItem[]>(
    () => myGroups.map((group) => ({ kind: 'group', key: `g${group.id}`, group, createdAt: group.created_at })),
    [myGroups]
  );

  // Públicos e privados intercalados pela data de criação, mais novos
  // primeiro -- a mesma ordem que a lista já tinha.
  const discoverItems = useMemo<ListItem[]>(() => {
    const query = search.trim().toLowerCase();
    const matches = (name: string) => query.length === 0 || name.toLowerCase().includes(query);
    const items: ListItem[] = [
      ...discoverGroups
        .filter((group) => matches(group.name))
        .map((group): ListItem => ({ kind: 'group', key: `g${group.id}`, group, createdAt: group.created_at })),
      ...privateDiscoverGroups
        .filter((group) => matches(group.name))
        .map((group): ListItem => ({ kind: 'private', key: `p${group.id}`, group, createdAt: group.created_at })),
    ];
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [discoverGroups, privateDiscoverGroups, search]);

  if (loading) {
    return <LoadingView />;
  }

  const items = tab === 'mine' ? myItems : discoverItems;
  const hasAnyGroup = myGroups.length > 0 || discoverGroups.length > 0 || privateDiscoverGroups.length > 0;
  const emptyText =
    tab === 'mine'
      ? 'Você ainda não participa de nenhum grupo.'
      : search.trim().length > 0
        ? 'Nenhum grupo encontrado com esse nome.'
        : 'Nenhum grupo encontrado.';

  return (
    <View style={styles.container}>
      <UnderlineTabs tabs={TABS} active={tab} onChange={setTab} style={styles.tabs} />

      {tab === 'discover' ? (
        <View style={styles.searchContainer}>
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar grupos pelo nome"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {/* Com a lista já na tela, uma falha ao recarregar vira aviso acima
          dela em vez de apagar o que o usuário estava vendo. */}
      {error && hasAnyGroup ? (
        <View style={styles.errorBanner}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : null}

      {error && !hasAnyGroup ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) =>
            item.kind === 'private' ? (
              <PrivateGroupCard group={item.group} onRequested={refresh} />
            ) : (
              <Link href={`/groups/${item.group.id}`} asChild>
                <TouchableOpacity>
                  <GroupCard
                    group={item.group}
                    isAdmin={adminGroupIds.has(item.group.id)}
                    pendingRequests={pendingRequestCounts.get(item.group.id) ?? 0}
                  />
                </TouchableOpacity>
              </Link>
            )
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{emptyText}</Text>
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
  tabs: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  errorBanner: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
  },
});
