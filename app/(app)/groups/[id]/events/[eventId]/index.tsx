import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../../../components/Button';
import { LoadingView } from '../../../../../../components/LoadingView';
import { StatusText } from '../../../../../../components/StatusText';
import { colors } from '../../../../../../constants/colors';
import { useAuth } from '../../../../../../context/AuthContext';
import { EventStatus } from '../../../../../../hooks/useGroupEvents';
import { useEvent } from '../../../../../../hooks/useEvent';
import { EventParticipant, useEventParticipants } from '../../../../../../hooks/useEventParticipants';
import { useGroup } from '../../../../../../hooks/useGroup';

const STATUS_LABELS: Record<EventStatus, string> = {
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

function ParticipantRow({ participant }: { participant: EventParticipant }) {
  const name = participant.users?.name ?? participant.guest_name ?? 'Usuário';
  const photoUrl = participant.users?.profile_photo_url ?? null;

  return (
    <View style={styles.participantRow}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>{name.charAt(0).toUpperCase() || '?'}</Text>
        </View>
      )}
      <Text style={styles.participantName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export default function EventDetail() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const groupId = Number(id);
  const numericEventId = Number(eventId);

  const { user } = useAuth();
  const { membership } = useGroup(groupId);
  const { event, loading: eventLoading, error: eventError, refresh: refreshEvent } = useEvent(numericEventId);
  const {
    participants,
    loading: participantsLoading,
    error: participantsError,
    refresh: refreshParticipants,
    join,
    leave,
    submitting,
    actionError,
  } = useEventParticipants(numericEventId);

  useFocusEffect(
    useCallback(() => {
      refreshEvent();
      refreshParticipants();
    }, [refreshEvent, refreshParticipants])
  );

  if (eventLoading) {
    return <LoadingView />;
  }

  if (eventError || !event) {
    return (
      <View style={styles.centered}>
        <StatusText variant="error">{eventError ?? 'Pedal não encontrado.'}</StatusText>
      </View>
    );
  }

  const isCreator = event.created_by === user?.id;
  const isGroupAdmin = membership?.role === 'admin';
  const canEdit = isCreator || isGroupAdmin;
  const isParticipant = participants.some((p) => p.user_id === user?.id);

  async function handleToggleParticipation() {
    if (isParticipant) {
      await leave();
    } else {
      await join();
    }
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={participants}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <ParticipantRow participant={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            {event.status !== 'scheduled' ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{STATUS_LABELS[event.status]}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.meta}>
            {formatDate(event.event_date)} às {formatTime(event.start_time)} · {event.group_name}
          </Text>
          {event.meeting_point ? <Text style={styles.meta}>Ponto de encontro: {event.meeting_point}</Text> : null}
          {event.route_description ? <Text style={styles.meta}>Percurso: {event.route_description}</Text> : null}
          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
          <Text style={styles.meta}>Criado por {event.creator_name}</Text>

          {actionError ? <StatusText variant="error">{actionError}</StatusText> : null}

          <Button
            title={isParticipant || isCreator ? 'Sair' : 'Participar'}
            variant={isParticipant || isCreator ? 'destructive' : 'primary'}
            onPress={handleToggleParticipation}
            disabled={isCreator}
            loading={submitting}
          />

          {canEdit ? (
            <Link href={`/groups/${groupId}/events/${numericEventId}/edit`} asChild>
              <Button title="Editar pedal" variant="plain" onPress={() => {}} />
            </Link>
          ) : null}

          <Text style={styles.sectionTitle}>Participantes</Text>

          {participantsError ? <StatusText variant="error">{participantsError}</StatusText> : null}
        </View>
      }
      ListEmptyComponent={
        participantsLoading ? null : (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhum participante ainda.</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    gap: 8,
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
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
  meta: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 15,
    color: '#444',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.placeholder,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontWeight: '600',
  },
  participantName: {
    fontSize: 15,
    flexShrink: 1,
  },
});
