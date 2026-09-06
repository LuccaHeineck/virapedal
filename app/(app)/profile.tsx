import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusText } from '../../components/StatusText';
import { colors } from '../../constants/colors';
import { EventStatus } from '../../hooks/useGroupEvents';
import { useMyEventParticipations } from '../../hooks/useMyEventParticipations';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

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

export default function Profile() {
  const { profile, loading, error, save } = useProfile();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const { events: myEvents, loading: myEventsLoading, error: myEventsError, refresh: refreshMyEvents } = useMyEventParticipations();

  useFocusEffect(
    useCallback(() => {
      refreshMyEvents();
    }, [refreshMyEvents])
  );

  useEffect(() => {
    if (profile) {
      setName(profile.name);
    }
  }, [profile]);

  async function handleSave() {
    if (saving || name.trim().length === 0) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const ok = await save({ name: name.trim() });

    setSaving(false);
    setSaveSuccess(ok);
    if (!ok) {
      setSaveError('Não foi possível salvar suas alterações. Tente novamente.');
    }
  }

  async function handleSignOut() {
    setSignOutError(null);
    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      setSignOutError(signOutErr.message);
    }
    // Em caso de sucesso, o listener onAuthStateChange do AuthContext recebe SIGNED_OUT
    // e o roteamento do layout raiz redireciona para o grupo não autenticado.
  }

  if (loading) {
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
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.status !== 'scheduled' ? (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.status]}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.eventMeta}>
              {formatDate(item.event_date)} às {formatTime(item.start_time)} · {item.group_name}
            </Text>
            {item.meeting_point ? <Text style={styles.eventMeta}>Ponto de encontro: {item.meeting_point}</Text> : null}
          </TouchableOpacity>
        </Link>
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>

          {profile.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setSaveSuccess(false);
            }}
            placeholder="Nome"
            editable={!saving}
          />

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          {saveSuccess ? <Text style={styles.success}>Salvo.</Text> : null}

          <TouchableOpacity
            style={[styles.button, (saving || name.trim().length === 0) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving || name.trim().length === 0}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
          </TouchableOpacity>

          {signOutError ? <Text style={styles.error}>{signOutError}</Text> : null}

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sair</Text>
          </TouchableOpacity>

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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: '#2f6feb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#c0392b',
  },
  success: {
    color: '#2a8a4a',
  },
  button: {
    backgroundColor: '#2f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  signOutButtonText: {
    color: '#c0392b',
    fontSize: 16,
    fontWeight: '600',
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
    paddingVertical: 12,
    gap: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.placeholder,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#555',
  },
  eventMeta: {
    fontSize: 14,
    color: '#666',
  },
});
