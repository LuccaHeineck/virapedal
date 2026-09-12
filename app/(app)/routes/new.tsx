import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../../components/Button';
import { PedalPicker } from '../../../components/PedalPicker';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { neutrals } from '../../../constants/colors';
import { useLinkableEvents } from '../../../hooks/useLinkableEvents';
import { useStartRoute } from '../../../hooks/useStartRoute';

export default function NewRoute() {
  const router = useRouter();
  const { createRoute, submitting, createError } = useStartRoute();
  const [name, setName] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);

  // Pedais de hoje nos grupos do usuário. useMemo para a data não mudar a cada
  // render e refazer a busca em loop.
  const today = useMemo(() => new Date().toISOString(), []);
  const { events } = useLinkableEvents(today);

  async function handleStart() {
    if (submitting) {
      return;
    }
    const route = await createRoute({ name: name.trim().length > 0 ? name.trim() : null, eventId });
    if (route) {
      // replace (não push) para o "voltar" da tela de detalhe não cair de
      // volta neste formulário modal.
      router.replace(`/routes/${route.id}`);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextField
        label="Nome da rota"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Volta na Cantareira (opcional)"
        placeholderTextColor={neutrals.mute}
        style={styles.input}
        editable={!submitting}
      />

      <PedalPicker
        title="Vai em algum pedal?"
        events={events}
        selectedId={eventId}
        disabled={submitting}
        onSelect={setEventId}
      />

      {createError ? <StatusText variant="error">{createError}</StatusText> : null}

      <Button title="Iniciar rota" onPress={handleStart} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutrals.paper,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  input: {
    borderColor: neutrals.hairline,
    backgroundColor: '#fff',
    color: neutrals.ink,
  },
});
