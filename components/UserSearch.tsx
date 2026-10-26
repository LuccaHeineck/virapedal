import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, palette } from '../constants/colors';
import { fonts } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { Avatar } from './Avatar';

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
        <Ionicons name="search-outline" size={20} color={palette.inkInactive} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar pessoas no Virapedal"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          returnKeyType="search"
          accessibilityLabel="Nome da pessoa"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={20} color={palette.inkInactive} />
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
            <Avatar photo={item.profile_photo_url} name={item.name} size={44} />
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color={palette.inkInactive} />
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
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: palette.surface,
  },
  input: { flex: 1, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14.5, color: palette.ink },
  list: { flex: 1 },
  resultRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  name: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14.5, color: palette.ink },
  empty: { paddingTop: 32, alignItems: 'center' },
  emptyText: { color: palette.inkInactive, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
});
