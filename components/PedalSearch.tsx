import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { EventStatus } from '../hooks/useGroupEvents';
import { supabase } from '../lib/supabase';
import { EventRow } from './EventRow';

type PedalResult = {
  id: number;
  group_id: number;
  title: string;
  event_date: string;
  start_time: string;
  meeting_point: string | null;
  status: EventStatus;
  groups: { name: string; image_url: string | null } | null;
};

type PedalSearchProps = {
  onSelectPedal: (groupId: number, eventId: number) => void;
};

export function PedalSearch({ onSelectPedal }: PedalSearchProps) {
  const [query, setQuery] = useState('');
  const [completedOnly, setCompletedOnly] = useState(false);
  const [results, setResults] = useState<PedalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const searchTerm = query.trim();

  useEffect(() => {
    if (searchTerm.length === 1) {
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
        let request = supabase
          .from('events')
          .select('id, group_id, title, event_date, start_time, meeting_point, status, groups(name, image_url)')
          .order('event_date', { ascending: false })
          .order('start_time', { ascending: false })
          .limit(30);

        if (searchTerm.length >= 2) {
          // Trata %, _ e \\ como texto, não como curingas do ILIKE.
          const literalTerm = searchTerm.replace(/[\\%_]/g, '\\$&');
          request = request.ilike('title', `%${literalTerm}%`);
        }
        if (completedOnly) {
          request = request.eq('status', 'completed');
        }

        const { data, error: searchError } = await request.returns<PedalResult[]>();
        if (!active) return;

        if (searchError) {
          setError(true);
        } else {
          setResults(data ?? []);
        }
        setLoading(false);
      })();
    }, searchTerm.length >= 2 ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm, completedOnly]);

  const emptyMessage = error
    ? 'Não foi possível buscar pedais. Tente novamente.'
    : searchTerm.length === 1
      ? 'Digite pelo menos 2 letras para buscar pedais.'
      : 'Nenhum pedal encontrado.';

  return (
    <View style={styles.container}>
      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar pedais pelo nome"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          returnKeyType="search"
          accessibilityLabel="Nome do pedal"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filter, !completedOnly && styles.filterActive]}
          onPress={() => setCompletedOnly(false)}
          accessibilityRole="button"
          accessibilityState={{ selected: !completedOnly }}
        >
          <Text style={[styles.filterText, !completedOnly && styles.filterTextActive]}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filter, completedOnly && styles.filterActive]}
          onPress={() => setCompletedOnly(true)}
          accessibilityRole="button"
          accessibilityState={{ selected: completedOnly }}
        >
          <Text style={[styles.filterText, completedOnly && styles.filterTextActive]}>Concluídos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        data={results}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelectPedal(item.group_id, item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir pedal ${item.title}`}
          >
            <EventRow
              title={item.title}
              status={item.status}
              eventDate={item.event_date}
              startTime={item.start_time}
              meetingPoint={item.meeting_point}
              groupName={item.groups?.name ?? ''}
              groupImagePath={item.groups?.image_url ?? null}
            />
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
  filters: { flexDirection: 'row', gap: 8 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.placeholder,
  },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: '#555', fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { flex: 1 },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
  empty: { paddingTop: 32, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
});
