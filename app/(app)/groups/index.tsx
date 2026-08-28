import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GroupCard } from '../../../components/GroupCard';
import { LoadingView } from '../../../components/LoadingView';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../constants/colors';
import { useGroups } from '../../../hooks/useGroups';

type Tab = 'mine' | 'discover';

export default function GroupsList() {
  const { myGroups, discoverGroups, loading, error, refresh } = useGroups();
  const [tab, setTab] = useState<Tab>('mine');
  const [search, setSearch] = useState('');

  // useGroups() só busca no mount — sem isso, voltar para esta tela depois
  // de criar/entrar/sair de um grupo em outra tela (a instância da pilha
  // permanece montada) continuaria mostrando a lista desatualizada.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filteredDiscoverGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return discoverGroups;
    }
    return discoverGroups.filter((g) => g.name.toLowerCase().includes(query));
  }, [discoverGroups, search]);

  if (loading) {
    return <LoadingView />;
  }

  const groups = tab === 'mine' ? myGroups : filteredDiscoverGroups;
  const emptyText =
    tab === 'mine'
      ? 'Você ainda não participa de nenhum grupo.'
      : search.trim().length > 0
        ? 'Nenhum grupo encontrado com esse nome.'
        : 'Nenhum grupo encontrado.';

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'mine' && styles.tabActive]} onPress={() => setTab('mine')}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Meus grupos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'discover' && styles.tabActive]}
          onPress={() => setTab('discover')}>
          <Text style={[styles.tabText, tab === 'discover' && styles.tabTextActive]}>Descobrir</Text>
        </TouchableOpacity>
      </View>

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

      {error ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Link href={`/groups/${item.id}`} asChild>
              <TouchableOpacity>
                <GroupCard group={item} />
              </TouchableOpacity>
            </Link>
          )}
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
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.placeholder,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  tabTextActive: {
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
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
