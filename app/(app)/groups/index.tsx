import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getInitials } from '../../../components/Avatar';
import { GroupCard } from '../../../components/GroupCard';
import { LoadingView } from '../../../components/LoadingView';
import { PrivateGroupCard } from '../../../components/PrivateGroupCard';
import { IconButton, ScreenHeader } from '../../../components/ScreenHeader';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../constants/colors';
import { SCREEN_GUTTER, type } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
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
  const router = useRouter();
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;
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


  const query = search.trim().toLowerCase();

  // A busca do topo vale para as duas abas.
  const myItems = useMemo<ListItem[]>(
    () =>
      myGroups
        .filter((group) => query.length === 0 || group.name.toLowerCase().includes(query))
        .map((group) => ({ kind: 'group', key: `g${group.id}`, group, createdAt: group.created_at })),
    [myGroups, query]
  );

  // Públicos e privados intercalados pela data de criação, mais novos
  // primeiro -- a mesma ordem que a lista já tinha.
  const discoverItems = useMemo<ListItem[]>(() => {
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
  }, [discoverGroups, privateDiscoverGroups, query]);

  const items = tab === 'mine' ? myItems : discoverItems;
  const hasAnyGroup = myGroups.length > 0 || discoverGroups.length > 0 || privateDiscoverGroups.length > 0;
  const emptyText =
    query.length > 0
      ? 'Nenhum grupo encontrado com esse nome.'
      : tab === 'mine'
        ? 'Você ainda não participa de nenhum grupo.'
        : 'Nenhum grupo encontrado.';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Grupos"
        actions={
          <>
            <IconButton icon="add" onPress={() => router.push('/groups/new')} accessibilityLabel="Criar grupo" />
            <IconButton
              initials={getInitials(name ?? '')}
              onPress={() => router.navigate('/profile')}
              accessibilityLabel="Abrir perfil"
            />
          </>
        }
      />

      <View style={styles.controls}>
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar grupos"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
        <SegmentedControl options={TABS} active={tab} onChange={setTab} />
      </View>

      {/* Com a lista já na tela, uma falha ao recarregar vira aviso acima
          dela em vez de apagar o que o usuário estava vendo. */}
      {error && hasAnyGroup ? (
        <View style={styles.errorBanner}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : null}

      {loading ? (
        <LoadingView />
      ) : error && !hasAnyGroup ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) =>
            item.kind === 'private' ? (
              <PrivateGroupCard group={item.group} onRequested={refresh} />
            ) : (
              <Link href={`/groups/${item.group.id}`} asChild>
                <TouchableOpacity activeOpacity={0.8}>
                  <GroupCard
                    group={item.group}
                    isAdmin={adminGroupIds.has(item.group.id)}
                    pendingRequests={pendingRequestCounts.get(item.group.id) ?? 0}
                    isMember={tab === 'mine'}
                  />
                </TouchableOpacity>
              </Link>
            )
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={type.empty}>{emptyText}</Text>
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
  controls: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 16,
    gap: 14,
  },
  search: {
    minHeight: 44,
    fontSize: 14,
  },
  errorBanner: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: SCREEN_GUTTER,
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
});
