import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../../../components/Button';
import { StatusText } from '../../../../../components/StatusText';
import { TextField } from '../../../../../components/TextField';
import { colors } from '../../../../../constants/colors';
import { useGroup } from '../../../../../hooks/useGroup';
import { useGroupEvents } from '../../../../../hooks/useGroupEvents';

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_SHAPE = /^\d{2}:\d{2}$/;

export default function NewGroupEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const router = useRouter();

  const { membership, loading: groupLoading } = useGroup(groupId);
  const { createEvent, submitting, createError } = useGroupEvents(groupId);

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // A tela se esconde para não-membros como conveniência de UI — a aplicação
  // real da regra é o RLS (is_group_member na policy de INSERT de events).
  if (!groupLoading && !membership) {
    return (
      <View style={styles.centered}>
        <StatusText variant="error">Você precisa ser membro do grupo para criar um pedal.</StatusText>
      </View>
    );
  }

  const canSubmit =
    title.trim().length > 0 &&
    DATE_SHAPE.test(eventDate.trim()) &&
    TIME_SHAPE.test(startTime.trim()) &&
    meetingPoint.trim().length > 0 &&
    !submitting;

  async function handleCreate() {
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

    const ok = await createEvent({
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextField label="Título do pedal" value={title} onChangeText={setTitle} placeholder="Ex: Pedal Noturno Estrela" editable={!submitting} />
      <TextField
        label="Data"
        value={eventDate}
        onChangeText={setEventDate}
        placeholder="AAAA-MM-DD"
        editable={!submitting}
      />
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
});
