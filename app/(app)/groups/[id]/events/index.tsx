import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EventRow } from '../../../../../components/EventRow';
import { LoadingView } from '../../../../../components/LoadingView';
import { StatusText } from '../../../../../components/StatusText';
import { colors } from '../../../../../constants/colors';
import { useGroup } from '../../../../../hooks/useGroup';
import { useGroupEvents } from '../../../../../hooks/useGroupEvents';

export default function GroupEventsFeed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const { group, membership } = useGroup(groupId);
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
              <TouchableOpacity>
                <EventRow
                  title={item.title}
                  status={item.status}
                  eventDate={item.event_date}
                  startTime={item.start_time}
                  meetingPoint={item.meeting_point}
                  groupName={group?.name ?? ''}
                  groupImagePath={group?.image_url ?? null}
                  isParticipant={item.is_participant}
                />
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
});
