import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../../../../components/Avatar';
import { Button } from '../../../../../../components/Button';
import { ConfirmDialog } from '../../../../../../components/ConfirmDialog';
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
  onOpenProfile?: () => void;
  removing?: boolean;
};

type DeleteConfirmation =
  | { kind: 'event' }
  | { kind: 'participant'; participant: EventParticipant }
  | null;

function ParticipantRow({ participant, canRemove = false, onRemove, onOpenProfile, removing = false }: ParticipantRowProps) {
  const restricted = participant.user_id !== null && participant.users === null;
  const name = participant.users?.name ?? participant.guest_name ?? (restricted ? 'Perfil restrito' : 'Usuário');
  const photoUrl = participant.users?.profile_photo_url ?? null;
  const isGuest = !participant.user_id;

  return (
    <View style={styles.participantRow}>
      <TouchableOpacity
        style={styles.participantIdentity}
        onPress={onOpenProfile}
        disabled={!onOpenProfile}
        accessibilityRole={onOpenProfile ? 'button' : undefined}
        accessibilityLabel={onOpenProfile ? `Abrir perfil de ${name}` : undefined}
      >
        {restricted ? (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="lock-closed-outline" size={20} color="#fff" />
          </View>
        ) : (
          <Avatar photo={photoUrl} name={name} size={40} />
        )}
        <Text style={styles.participantName} numberOfLines={1}>
          {name}
        </Text>
      </TouchableOpacity>
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
    // Sair para outra aba com replace nao remove esta tela da pilha de
    // Grupos: ela fica pendurada no topo, e o proximo modal aberto ali (o
    // "+" da Home) aparece com este pedal visivel por baixo. dismissAll()
    // faz popToTop antes de trocar de aba. No caso de voltar para a lista
    // de pedais do proprio grupo o replace ja basta, porque a troca
    // acontece dentro da mesma pilha.
    if (from === 'home' || from === 'profile') {
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace(from === 'home' ? '/' : '/profile');
      return;
    }

    router.replace(`/groups/${groupId}/events`);
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

  async function handleConfirmDelete() {
    if (deleteConfirmation?.kind === 'participant') {
      await removeParticipant(deleteConfirmation.participant.id);
      setDeleteConfirmation(null);
      return;
    }

    if (deleteConfirmation?.kind === 'event') {
      const ok = await deleteEvent();
      // Fecha o diálogo sempre, e antes de navegar: esta tela continua
      // montada na pilha da aba Grupos depois do handleBack(), então um
      // Modal deixado visível fica sobreposto na tela de destino.
      setDeleteConfirmation(null);
      if (ok) {
        handleBack();
      }
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

  function openProfile(userId: string | null) {
    if (!userId) return;

    router.push({
      pathname: '/groups/users/[userId]',
      params: { userId },
    });
  }

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
            onOpenProfile={() => openProfile(item.user_id)}
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

      <ConfirmDialog
        visible={deleteConfirmation !== null}
        title={deleteConfirmation?.kind === 'event' ? 'Excluir este pedal?' : 'Remover participante?'}
        message={
          deleteConfirmation?.kind === 'event'
            ? 'O pedal e seus dados serão excluídos permanentemente. Esta ação não pode ser desfeita.'
            : `${confirmationName} será removido da lista deste pedal.`
        }
        confirmLabel={deleteConfirmation?.kind === 'event' ? 'Excluir pedal' : 'Remover'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmation(null)}
        loading={confirmationLoading}
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
  participantIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
});
