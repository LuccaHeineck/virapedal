import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EventRow } from '../../components/EventRow';
import { LoadingView } from '../../components/LoadingView';
import { StatusText } from '../../components/StatusText';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents';
import { subscribeHomeRefresh } from '../../lib/homeRefreshEmitter';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;

  const { events, loading, error, refresh } = useUpcomingEvents();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Cobre o caso de tocar em "Início" já estando nela, que não muda o foco
  // e por isso não dispara o useFocusEffect acima.
  useEffect(() => subscribeHomeRefresh(refresh), [refresh]);

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
            <Link href={`/groups/${item.group_id}/events/${item.id}?from=home`} asChild>
              <TouchableOpacity>
                <EventRow
                  title={item.title}
                  status={item.status}
                  eventDate={item.event_date}
                  startTime={item.start_time}
                  meetingPoint={item.meeting_point}
                  groupName={item.group_name}
                  groupImagePath={item.group_image_url}
                  isParticipant={item.is_participant}
                />
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/groups/new-event')}
        accessibilityLabel="Criar pedal"
        accessibilityRole="button">
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
