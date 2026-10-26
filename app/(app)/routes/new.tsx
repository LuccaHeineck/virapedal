import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../../components/Button';
import { PedalPicker } from '../../../components/PedalPicker';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { neutrals, palette } from '../../../constants/colors';
import { useLinkableEvents } from '../../../hooks/useLinkableEvents';
import { useStartRoute } from '../../../hooks/useStartRoute';
import { clearTracking, getActiveSession, startTracking } from '../../../lib/routeTracking';
import {
  ensureTrackingPermission,
  TRACKING_PERMISSION_MESSAGES,
  TrackingPermission,
} from '../../../lib/routeTracking/permissions';
import { supabase } from '../../../lib/supabase';

export default function NewRoute() {
  const router = useRouter();
  const { createRoute, submitting, createError } = useStartRoute();
  const [name, setName] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [permissionIssue, setPermissionIssue] = useState<Exclude<TrackingPermission, 'ok'> | null>(null);
  // Rota que ainda está gravando (ou pausada) neste aparelho. O GPS só
  // alimenta uma rota por vez, então uma segunda não pode começar.
  const [openRouteId, setOpenRouteId] = useState<number | null>(null);

  // Pedais de hoje nos grupos do usuário. useMemo para a data não mudar a cada
  // render e refazer a busca em loop.
  const today = useMemo(() => new Date().toISOString(), []);
  const { events } = useLinkableEvents(today);

  useEffect(() => {
    (async () => {
      const session = await getActiveSession();
      if (!session) {
        return;
      }
      // A sessão local pode ter sobrado de uma rota já finalizada (o UPDATE
      // passou mas o app fechou antes de limpar) ou apagada. Só bloqueia se a
      // rota ainda estiver aberta no banco; senão a sessão é descartada.
      const { data, error } = await supabase
        .from('routes')
        .select('status')
        .eq('id', session.routeId)
        .maybeSingle<{ status: string }>();
      if (error) {
        // Sem rede não dá para saber; na dúvida, protege a rota em andamento.
        setOpenRouteId(session.routeId);
        return;
      }
      if (!data || data.status === 'finished') {
        await clearTracking(session.routeId);
        return;
      }
      setOpenRouteId(session.routeId);
    })();
  }, []);

  const busy = submitting || checking;

  async function handleStart() {
    if (busy) {
      return;
    }
    setPermissionIssue(null);
    setChecking(true);

    // Permissão antes de criar a linha: sem GPS a rota nasceria vazia.
    const permission = await ensureTrackingPermission();
    if (permission !== 'ok') {
      setPermissionIssue(permission);
      setChecking(false);
      return;
    }
    setChecking(false);

    const route = await createRoute({ name: name.trim().length > 0 ? name.trim() : null, eventId });
    if (!route) {
      return;
    }

    try {
      await startTracking(route.id);
    } catch {
      // A rota já existe; o detalhe percebe que o GPS não está ligado e
      // oferece "Retomar gravação" -- melhor que deixar a pessoa presa aqui.
    }

    // replace (não push) para o "voltar" da tela de detalhe não cair de
    // volta neste formulário modal.
    router.replace(`/routes/${route.id}`);
  }

  if (openRouteId !== null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StatusText variant="error">
          Você já tem uma rota em andamento. Finalize-a antes de iniciar outra.
        </StatusText>
        <Button title="Abrir rota em andamento" onPress={() => router.replace(`/routes/${openRouteId}`)} />
      </ScrollView>
    );
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
        editable={!busy}
      />

      <PedalPicker
        title="Vai em algum pedal?"
        events={events}
        selectedId={eventId}
        disabled={busy}
        onSelect={setEventId}
      />

      {permissionIssue ? <StatusText variant="error">{TRACKING_PERMISSION_MESSAGES[permissionIssue]}</StatusText> : null}
      {permissionIssue && Platform.OS !== 'web' ? (
        <Button title="Abrir configurações" variant="plain" onPress={() => Linking.openSettings()} />
      ) : null}
      {createError ? <StatusText variant="error">{createError}</StatusText> : null}

      <Button title="Iniciar rota" onPress={handleStart} loading={busy} />
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
    backgroundColor: palette.surface,
    color: neutrals.ink,
  },
});
