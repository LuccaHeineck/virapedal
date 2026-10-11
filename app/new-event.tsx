import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { LoadingView } from '../components/LoadingView';
import { StatusText } from '../components/StatusText';
import { DateField } from '../components/DateField';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import { colors } from '../constants/colors';
import { useCreateEvent } from '../hooks/useCreateEvent';
import { useGroups } from '../hooks/useGroups';
import { DEFAULT_EVENT_NOTES } from '../lib/eventDefaults';

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
  const [description, setDescription] = useState(DEFAULT_EVENT_NOTES);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Rede de seguranca: hoje a tela sai com back(), que a desempilha e
  // desmonta, entao o estado ja morreria junto. Mas basta alguem trocar a
  // saida por replace (como era antes) para o useState sobreviver e o
  // formulario reabrir preenchido -- limpar ao ganhar foco garante
  // formulario em branco independente de como se sai daqui.
  useFocusEffect(
    useCallback(() => {
      setSelectedGroupId(null);
      setTitle('');
      setEventDate('');
      setStartTime('');
      setMeetingPoint('');
      setRouteDescription('');
      setDescription(DEFAULT_EVENT_NOTES);
      setValidationError(null);
    }, [])
  );

  // Modal da pilha raiz (registrado em app/_layout.tsx), entao back()
  // simplesmente o desempilha e devolve a aba de onde veio -- sem truque
  // de replace/dismissAll, que so eram necessarios quando esta tela morava
  // dentro da pilha da aba Grupos.
  const backButton = (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Voltar"
            accessibilityRole="button">
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (groupsLoading) {
    return (
      <>
        {backButton}
        <LoadingView />
      </>
    );
  }

  if (myGroups.length === 0) {
    return (
      <>
        {backButton}
        <View style={styles.centered}>
          <StatusText variant="error">Você precisa participar de um grupo para criar um pedal.</StatusText>
        </View>
      </>
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
      setValidationError('Selecione uma data.');
      return;
    }
    if (!TIME_SHAPE.test(startTime.trim())) {
      setValidationError('Selecione um horário.');
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

    if (ok) {
      router.back();
    }
  }

  return (
    <>
      {backButton}
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
        <DateField label="Data" value={eventDate} onChange={setEventDate} disabled={submitting} />
        <TimeField label="Horário de saída" value={startTime} onChange={setStartTime} disabled={submitting} />
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
          placeholder="Avisos e recomendações para o pedal (opcional)"
          multiline
          numberOfLines={6}
          editable={!submitting}
        />

        {validationError ? <StatusText variant="error">{validationError}</StatusText> : null}
        {createError ? <StatusText variant="error">{createError}</StatusText> : null}

        <Button title="Criar pedal" onPress={handleCreate} disabled={!canSubmit} loading={submitting} />
      </ScrollView>
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
