import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../../components/Button';
import { LoadingView } from '../../../components/LoadingView';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../constants/colors';
import { useCreateEvent } from '../../../hooks/useCreateEvent';
import { useGroups } from '../../../hooks/useGroups';

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_SHAPE = /^\d{2}:\d{2}$/;

// Criação de pedal a partir da Home, sem grupo pré-selecionado pela rota
// (diferente de groups/[id]/events/new.tsx) -- por isso o passo extra de
// escolher o grupo aqui. Só grupos onde o usuário já é membro ativo entram
// na lista, já que a policy de INSERT de events exige is_group_member().
export default function NewEvent() {
  const router = useRouter();

  const { myGroups, loading: groupsLoading } = useGroups();
  const { createEvent, submitting, createError } = useCreateEvent();

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (groupsLoading) {
    return <LoadingView />;
  }

  if (myGroups.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusText variant="error">Você precisa participar de um grupo para criar um pedal.</StatusText>
      </View>
    );
  }

  const canSubmit =
    selectedGroupId !== null &&
    title.trim().length > 0 &&
    DATE_SHAPE.test(eventDate.trim()) &&
    TIME_SHAPE.test(startTime.trim()) &&
    meetingPoint.trim().length > 0 &&
    !submitting;

  async function handleCreate() {
    if (selectedGroupId === null) {
      setValidationError('Escolha um grupo.');
      return;
    }
    if (title.trim().length === 0 || meetingPoint.trim().length === 0) {
      setValidationError('Preencha título, data, horário e ponto de encontro.');
      return;
    }
    if (!DATE_SHAPE.test(eventDate.trim())) {
      setValidationError('Use o formato AAAA-MM-DD para a data.');
      return;
    }
    if (!TIME_SHAPE.test(startTime.trim())) {
      setValidationError('Use o formato HH:MM para o horário.');
      return;
    }
    setValidationError(null);

    const ok = await createEvent(selectedGroupId, {
      title: title.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      eventDate: eventDate.trim(),
      startTime: startTime.trim(),
      meetingPoint: meetingPoint.trim(),
      routeDescription: routeDescription.trim().length > 0 ? routeDescription.trim() : null,
    });

    // Aberta a partir da Home (única entrada hoje), então volta pra lá em
    // vez de router.back() -- essa tela vive dentro da pilha da aba
    // Grupos, cujo initialRouteName synthesiza "index" (lista de grupos)
    // como destino de voltar, não a Home de onde realmente se veio.
    if (ok) {
      router.replace('/');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Grupo</Text>
      <View style={styles.groupList}>
        {myGroups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[styles.groupOption, selectedGroupId === group.id && styles.groupOptionSelected]}
            onPress={() => setSelectedGroupId(group.id)}>
            <Text style={[styles.groupOptionText, selectedGroupId === group.id && styles.groupOptionTextSelected]} numberOfLines={1}>
              {group.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextField label="Título do pedal" value={title} onChangeText={setTitle} placeholder="Ex: Pedal Noturno Estrela" editable={!submitting} />
      <TextField label="Data" value={eventDate} onChangeText={setEventDate} placeholder="AAAA-MM-DD" editable={!submitting} />
      <TextField label="Horário de saída" value={startTime} onChangeText={setStartTime} placeholder="19:00" editable={!submitting} />
      <TextField
        label="Ponto de encontro"
        value={meetingPoint}
        onChangeText={setMeetingPoint}
        placeholder="Ex: Praça Menna Barreto"
        editable={!submitting}
      />
      <TextField
        label="Descrição da rota"
        value={routeDescription}
        onChangeText={setRouteDescription}
        placeholder="Ex: 25km asfalto e chão de terra (opcional)"
        editable={!submitting}
      />
      <TextField
        label="Observações"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: trazer iluminação e capacete (opcional)"
        multiline
        numberOfLines={3}
        editable={!submitting}
      />

      {validationError ? <StatusText variant="error">{validationError}</StatusText> : null}
      {createError ? <StatusText variant="error">{createError}</StatusText> : null}

      <Button title="Criar pedal" onPress={handleCreate} disabled={!canSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
  },
  groupOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  groupOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupOptionText: {
    fontSize: 14,
    color: '#444',
  },
  groupOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
