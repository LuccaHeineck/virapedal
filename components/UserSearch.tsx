import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { supabase } from '../lib/supabase';

type SearchUser = {
  id: string;
  name: string;
  profile_photo_url: string | null;
};

type UserSearchProps = {
  onSelectUser: (userId: string) => void;
};

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const searchTerm = query.trim();

  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setResults([]);
    setLoading(true);
    setError(false);

    const timer = setTimeout(() => {
      void (async () => {
        const { data, error: searchError } = await supabase.rpc('search_users', { p_query: searchTerm });
        if (!active) return;

        if (searchError) {
          setResults([]);
          setError(true);
        } else {
          setResults((data ?? []) as SearchUser[]);
        }
        setLoading(false);
      })();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const emptyMessage =
    searchTerm.length < 2
      ? 'Digite pelo menos 2 letras para buscar pessoas.'
      : error
        ? 'Não foi possível buscar usuários. Tente novamente.'
        : 'Nenhum usuário encontrado.';

  return (
    <View style={styles.container}>
      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar pessoas pelo nome"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          returnKeyType="search"
          accessibilityLabel="Nome da pessoa"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        style={styles.list}
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() => onSelectUser(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir perfil de ${item.name}`}
          >
            {item.profile_photo_url ? (
              <Image source={{ uri: item.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initial}>{item.name.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? <ActivityIndicator /> : <Text style={styles.emptyText}>{emptyMessage}</Text>}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12 },
  searchField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 16 },
  list: { flex: 1 },
  resultRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  initial: { color: '#fff', fontWeight: '600', fontSize: 18 },
  name: { flex: 1, fontSize: 16, fontWeight: '500' },
  empty: { paddingTop: 32, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
});
