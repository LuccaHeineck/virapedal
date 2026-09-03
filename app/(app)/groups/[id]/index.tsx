import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../components/Button';
import { GroupImage } from '../../../../components/GroupImage';
import { LoadingView } from '../../../../components/LoadingView';
import { StatusText } from '../../../../components/StatusText';
import { colors } from '../../../../constants/colors';
import { useGroup } from '../../../../hooks/useGroup';
import { useJoin } from '../../../../hooks/useJoin';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const { group, membership, pendingRequest, loading, error, refresh, leaveGroup, leaving, leaveError } =
    useGroup(groupId);
  const { joinPublicGroup, requestToJoin, submitting, error: joinError } = useJoin(groupId);

  // Voltar para cá depois de editar, entrar/sair ou gerenciar membros (a
  // instância desta tela na pilha permanece montada) não dispararia o
  // useEffect de busca do useGroup novamente sem isto.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading) {
    return <LoadingView />;
  }

  if (error || !group) {
    return (
      <View style={styles.centered}>
        <StatusText variant="error">{error ?? 'Grupo não encontrado.'}</StatusText>
      </View>
    );
  }

  async function handleJoin() {
    const ok = await joinPublicGroup();
    if (ok) {
      await refresh();
    }
  }

  async function handleRequest() {
    const ok = await requestToJoin();
    if (ok) {
      await refresh();
    }
  }

  async function handleLeave() {
    await leaveGroup();
  }

  async function handleDelete() {
    await deleteGroup(groupId);
  }

  const isAdmin = membership?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GroupImage key={group.updated_at} path={group.image_url} name={group.name} size={96} />

      <View style={styles.titleRow}>
        <Text style={styles.name}>{group.name}</Text>
        <View style={[styles.badge, group.privacy === 'private' && styles.badgePrivate]}>
          <Text style={styles.badgeText}>{group.privacy === 'public' ? 'Público' : 'Privado'}</Text>
        </View>
      </View>

      {group.description ? <Text style={styles.description}>{group.description}</Text> : null}

      {joinError ? <StatusText variant="error">{joinError}</StatusText> : null}
      {leaveError ? <StatusText variant="error">{leaveError}</StatusText> : null}

      {!membership && !pendingRequest && group.privacy === 'public' ? (
        <Button title="Entrar" onPress={handleJoin} loading={submitting} />
      ) : null}

      {!membership && !pendingRequest && group.privacy === 'private' ? (
        <Button title="Solicitar entrada" onPress={handleRequest} loading={submitting} />
      ) : null}

      {!membership && pendingRequest ? <Button title="Solicitação pendente" onPress={() => {}} disabled /> : null}

      {membership ? <Button title="Sair do grupo" variant="destructive" onPress={handleLeave} loading={leaving} /> : null}

      <Link href={`/groups/${group.id}/events`} asChild>
        <Button title="Pedais" variant="plain" onPress={() => {}} />
      </Link>

      {isAdmin ? (
        <View style={styles.adminLinks}>
          <Link href={`/groups/${group.id}/edit`} asChild>
            <Button title="Editar grupo" variant="plain" onPress={() => {}} />
          </Link>
          <Link href={`/groups/${group.id}/members`} asChild>
            <Button title="Membros" variant="plain" onPress={() => {}} />
          </Link>
          {group.privacy === 'private' ? (
            <Link href={`/groups/${group.id}/requests`} asChild>
              <Button title="Solicitações" variant="plain" onPress={() => {}} />
            </Link>
          ) : null}
        </View>
      ) : null}
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
    gap: 12,
    alignItems: 'stretch',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.placeholder,
  },
  badgePrivate: {
    backgroundColor: '#f0e4d0',
  },
  badgeText: {
    fontSize: 12,
    color: '#555',
  },
  description: {
    fontSize: 15,
    color: '#444',
  },
  adminLinks: {
    marginTop: 12,
    gap: 4,
  },
});
