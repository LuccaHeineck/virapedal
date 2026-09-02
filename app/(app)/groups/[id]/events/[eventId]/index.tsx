import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { id, eventId, from } = useLocalSearchParams<{ id: string; eventId: string; from?: string }>();
  const groupId = Number(id);
  const numericEventId = Number(eventId);
  const router = useRouter();

  const { user } = useAuth();
  const { membership } = useGroup(groupId);
  const {
    event,
    loading: eventLoading,
    error: eventError,
    refresh: refreshEvent,
    deleteEvent,
    deleting,
    deleteError,
  } = useEvent(numericEventId);
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

  // O header padrão do Stack sempre volta para "index" (lista de grupos) --
  // efeito colateral do initialRouteName do _layout, necessário para o F5
  // funcionar em rotas aninhadas, mas que quebra o "voltar" real quando esta
  // tela é aberta a partir de outra aba (Início). Por isso a origem vem
  // explícita via ?from= no link, e o botão de voltar é controlado aqui em
  // vez de depender do histórico nativo da pilha.
  const handleBack = useCallback(() => {
    router.replace(from === 'home' ? '/' : `/groups/${groupId}/events`);
  }, [router, from, groupId]);

  const backButton = (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <TouchableOpacity onPress={handleBack} hitSlop={8} accessibilityLabel="Voltar" accessibilityRole="button">
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (eventLoading) {
    return (
      <>
        {backButton}
        <LoadingView />
      </>
    );
  }

  if (eventError || !event) {
    return (
      <>
        {backButton}
        <View style={styles.centered}>
          <StatusText variant="error">{eventError ?? 'Pedal não encontrado.'}</StatusText>
        </View>
      </>
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

  async function confirmAndDelete() {
    const ok = await deleteEvent();
    if (ok) {
      handleBack();
    }
  }

  function handleDelete() {
    const message = 'Tem certeza que deseja excluir este pedal? Esta ação não pode ser desfeita.';

    // Alert.alert com múltiplos botões não é suportado de forma confiável no
    // React Native Web (0.21) -- no navegador ele não exibe nada. window.confirm
    // é o equivalente nativo do browser para esse caso.
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        confirmAndDelete();
      }
      return;
    }

    Alert.alert('Excluir pedal', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: confirmAndDelete },
    ]);
  }

  return (
    <>
      {backButton}
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

            {canEdit ? (
              <Button title="Excluir pedal" variant="destructive" onPress={handleDelete} loading={deleting} />
            ) : null}
            {deleteError ? <StatusText variant="error">{deleteError}</StatusText> : null}

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
    </>
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
