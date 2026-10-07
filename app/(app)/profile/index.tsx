import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { EventRow } from '../../../components/EventRow';
import { StatusText } from '../../../components/StatusText';
import { useMyEventParticipations } from '../../../hooks/useMyEventParticipations';
import { useProfile } from '../../../hooks/useProfile';

export default function Profile() {
  const { profile, loading, error, refresh: refreshProfile } = useProfile();

  const { events: myEvents, loading: myEventsLoading, error: myEventsError, refresh: refreshMyEvents } = useMyEventParticipations();

  // Também recarrega o perfil: nome e foto podem ter mudado em Configurações.
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      refreshMyEvents();
    }, [refreshProfile, refreshMyEvents])
  );

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? 'Não foi possível carregar seu perfil. Tente novamente.'}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={myEvents}
      keyExtractor={(item) => String(item.id)}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <Link href={`/groups/${item.group_id}/events/${item.id}?from=profile`} asChild>
          <TouchableOpacity style={styles.eventRow}>
            <EventRow
              title={item.title}
              status={item.status}
              eventDate={item.event_date}
              startTime={item.start_time}
              meetingPoint={item.meeting_point}
              groupName={item.group_name}
              groupImagePath={item.group_image_url}
            />
          </TouchableOpacity>
        </Link>
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.identity}>
            <Avatar photo={profile.profile_photo_url} name={profile.name} size={88} />
            <Text style={styles.name}>{profile.name}</Text>
          </View>

          <Text style={styles.sectionTitle}>Meus pedais</Text>
          {myEventsError ? <StatusText variant="error">{myEventsError}</StatusText> : null}
        </View>
      }
      ListEmptyComponent={
        myEventsLoading ? null : (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Você ainda não participa de nenhum pedal.</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    padding: 24,
    gap: 12,
    alignItems: 'stretch',
  },
  identity: {
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  error: {
    color: '#c0392b',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
  },
  eventRow: {
    paddingHorizontal: 24,
  },
});
