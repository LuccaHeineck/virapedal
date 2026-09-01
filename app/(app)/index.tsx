import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LoadingView } from '../../components/LoadingView';
import { StatusText } from '../../components/StatusText';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents';

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

export default function Home() {
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;

  const { events, loading, error, refresh } = useUpcomingEvents();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name ? `Olá, ${name}` : 'Bem-vindo ao Virapedal'}</Text>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Link href={`/groups/${item.group_id}/events`} asChild>
              <TouchableOpacity style={styles.eventRow}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.eventMeta}>
                  {formatDate(item.event_date)} às {formatTime(item.start_time)} · {item.group_name}
                </Text>
                {item.meeting_point ? <Text style={styles.eventMeta}>Ponto de encontro: {item.meeting_point}</Text> : null}
              </TouchableOpacity>
            </Link>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhum pedal agendado nos seus grupos.</Text>
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
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
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
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
  },
  eventRow: {
    paddingVertical: 12,
    gap: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventMeta: {
    fontSize: 14,
    color: '#666',
  },
});
