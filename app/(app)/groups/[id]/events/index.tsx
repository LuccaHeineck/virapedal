import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LoadingView } from '../../../../../components/LoadingView';
import { StatusText } from '../../../../../components/StatusText';
import { colors } from '../../../../../constants/colors';
import { useGroup } from '../../../../../hooks/useGroup';
import { GroupEvent, useGroupEvents } from '../../../../../hooks/useGroupEvents';

const STATUS_LABELS: Record<GroupEvent['status'], string> = {
  scheduled: 'Agendado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

export default function GroupEventsFeed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const { membership } = useGroup(groupId);
  const { events, loading, error, refresh } = useGroupEvents(groupId);

  // A instância desta tela permanece montada ao voltar de "Novo pedal" — sem
  // isso, o pedal recém-criado não apareceria na lista até um refresh manual.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading) {
    return <LoadingView />;
  }

  return (
    <View style={styles.container}>
      {membership ? (
        <View style={styles.newButtonContainer}>
          <Link href={`/groups/${groupId}/events/new`} asChild>
            <TouchableOpacity style={styles.newButton}>
              <Text style={styles.newButtonText}>+ Criar pedal</Text>
            </TouchableOpacity>
          </Link>
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Link href={`/groups/${groupId}/events/${item.id}`} asChild>
              <TouchableOpacity style={styles.eventRow}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.status !== 'scheduled' ? (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.eventMeta}>
                  {formatDate(item.event_date)} às {formatTime(item.start_time)}
                </Text>
                {item.meeting_point ? <Text style={styles.eventMeta}>Ponto de encontro: {item.meeting_point}</Text> : null}
              </TouchableOpacity>
            </Link>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhum pedal agendado.</Text>
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
  newButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  newButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  newButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  eventRow: {
    paddingVertical: 12,
    gap: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.placeholder,
  },
  statusText: {
    fontSize: 12,
    color: '#555',
  },
  eventMeta: {
    fontSize: 14,
    color: '#666',
  },
});
