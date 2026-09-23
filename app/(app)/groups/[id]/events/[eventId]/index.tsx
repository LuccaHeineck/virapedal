import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../../../../../components/Button';
import { LoadingView } from '../../../../../../components/LoadingView';
import { StatusText } from '../../../../../../components/StatusText';
import { TextField } from '../../../../../../components/TextField';
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

type ParticipantRowProps = {
  participant: EventParticipant;
  canRemove?: boolean;
  onRemove?: () => void;
  removing?: boolean;
};

type DeleteConfirmation =
  | { kind: 'event' }
  | { kind: 'participant'; participant: EventParticipant }
  | null;

function ParticipantRow({ participant, canRemove = false, onRemove, removing = false }: ParticipantRowProps) {
  const name = participant.users?.name ?? participant.guest_name ?? 'Usuário';
  const photoUrl = participant.users?.profile_photo_url ?? null;
  const isGuest = !participant.user_id;

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
      {isGuest ? (
        <View style={styles.guestBadge}>
          <Text style={styles.guestBadgeText}>Convidado</Text>
        </View>
      ) : null}
      {canRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          disabled={removing}
          hitSlop={8}
          accessibilityLabel={`Remover ${name} do pedal`}
          accessibilityRole="button"
          style={styles.removeParticipantButton}
        >
          {removing ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Ionicons name="trash-outline" size={19} color={colors.error} />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function EventDetail() {
  const { id, eventId, from } = useLocalSearchParams<{ id: string; eventId: string; from?: string }>();
  const groupId = Number(id);
  const numericEventId = Number(eventId);
  const router = useRouter();

  const [guestName, setGuestName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(null);

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
    addGuest,
    removeParticipant,
    submitting,
    removingParticipantId,
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
  // tela é aberta a partir de outra aba (Início ou Perfil). Por isso a
  // origem vem explícita via ?from= no link, e o botão de voltar é
  // controlled aqui em vez de depender do histórico nativo da pilha.
  const handleBack = useCallback(() => {
    if (from === 'home') {
      router.replace('/');
    } else if (from === 'profile') {
      router.replace('/profile');
    } else {
      router.replace(`/groups/${groupId}/events`);
    }
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

  // aqui ele filtra os participantes em duas listas: os registrados (com user_id) e os convidados (sem user_id ou com guest_name)
  const registeredParticipants = participants.filter((p) => p.user_id !== null);
  const guestParticipants = participants.filter((p) => p.guest_name !== null || p.user_id === null);

  async function handleToggleParticipation() {
    if (isParticipant) {
      await leave();
    } else {
      await join();
    }
  }

  async function handleAddGuest() {
    if (!guestName.trim()) return;
    const ok = await addGuest(guestName.trim());
    if (ok) {
      setGuestName('');
    }
  }

  async function confirmAndDelete() {
    const ok = await deleteEvent();
    if (ok) {
      handleBack();
    }
    return ok;
  }

  async function handleConfirmDelete() {
    if (deleteConfirmation?.kind === 'participant') {
      await removeParticipant(deleteConfirmation.participant.id);
      setDeleteConfirmation(null);
    } else if (deleteConfirmation?.kind === 'event') {
      const ok = await confirmAndDelete();
      if (!ok) setDeleteConfirmation(null);
    }
  }

  const participantBeingRemoved =
    deleteConfirmation?.kind === 'participant' &&
    removingParticipantId === deleteConfirmation.participant.id;
  const confirmationLoading = deleting || participantBeingRemoved;
  const confirmationName =
    deleteConfirmation?.kind === 'participant'
      ? deleteConfirmation.participant.users?.name ?? deleteConfirmation.participant.guest_name ?? 'este participante'
      : null;

  return (
    <>
      {backButton}
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={registeredParticipants}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ParticipantRow
            participant={item}
            canRemove={isCreator && item.user_id !== user?.id}
            onRemove={() => setDeleteConfirmation({ kind: 'participant', participant: item })}
            removing={removingParticipantId === item.id}
          />
        )}
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

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.meta}>
                {formatDate(event.event_date)} às {formatTime(event.start_time)} · {event.group_name}
              </Text>
            </View>
            {event.meeting_point ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.meta}>{event.meeting_point}</Text>
              </View>
            ) : null}
            {event.route_description ? <Text style={styles.meta}>Percurso: {event.route_description}</Text> : null}
            {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
            <Text style={styles.meta}>Criado por {event.creator_name}</Text>

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
              <Button
                title="Excluir pedal"
                variant="destructive"
                onPress={() => setDeleteConfirmation({ kind: 'event' })}
                loading={deleting}
              />
            ) : null}

            {actionError ? <StatusText variant="error">{actionError}</StatusText> : null}
            {deleteError ? <StatusText variant="error">{deleteError}</StatusText> : null}

            {canEdit ? (
              <View style={styles.guestSection}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Adicionar Convidado"
                    placeholder="Nome do convidado"
                    value={guestName}
                    onChangeText={setGuestName}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.guestButtonContainer}>
                  <Button
                    title="Adicionar"
                    variant="primary"
                    onPress={handleAddGuest}
                    disabled={submitting || !guestName.trim()}
                    loading={submitting}
                  />
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Participantes ({registeredParticipants.length})</Text>

            {participantsError ? <StatusText variant="error">{participantsError}</StatusText> : null}
          </View>
        }
        ListFooterComponent={
          guestParticipants.length > 0 ? (
            <View style={styles.guestListContainer}>
              <Text style={styles.sectionTitle}>Convidados ({guestParticipants.length})</Text>
              {guestParticipants.map((item) => (
                <ParticipantRow
                  key={String(item.id)}
                  participant={item}
                  canRemove={isCreator}
                  onRemove={() => setDeleteConfirmation({ kind: 'participant', participant: item })}
                  removing={removingParticipantId === item.id}
                />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          participantsLoading || guestParticipants.length > 0 ? null : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhum participante ainda.</Text>
            </View>
          )
        }
      />

      <Modal
        visible={deleteConfirmation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !confirmationLoading && setDeleteConfirmation(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard} accessibilityViewIsModal>
            <View style={styles.confirmationIcon}>
              <Ionicons name="trash-outline" size={25} color={colors.error} />
            </View>
            <Text style={styles.confirmationTitle}>
              {deleteConfirmation?.kind === 'event' ? 'Excluir este pedal?' : 'Remover participante?'}
            </Text>
            <Text style={styles.confirmationMessage}>
              {deleteConfirmation?.kind === 'event'
                ? 'O pedal e seus dados serão excluídos permanentemente. Esta ação não pode ser desfeita.'
                : `${confirmationName} será removido da lista deste pedal.`}
            </Text>
            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteConfirmation(null)}
                disabled={confirmationLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleConfirmDelete}
                disabled={confirmationLoading}
              >
                {confirmationLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>
                    {deleteConfirmation?.kind === 'event' ? 'Excluir pedal' : 'Remover'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  guestSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  guestButtonContainer: {
    minWidth: 120,
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
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    marginBottom: 8,
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
  removeParticipantButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f0',
  },
  guestListContainer: {
    marginTop: 8,
  },
  guestBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  guestBadgeText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
  },
  confirmationCard: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  confirmationIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f0',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  confirmationMessage: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
  },
  confirmationActions: {
    width: '100%',
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
