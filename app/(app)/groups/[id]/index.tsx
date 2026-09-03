import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../components/Button';
import { GroupImage } from '../../../../components/GroupImage';
import { LoadingView } from '../../../../components/LoadingView';
import { NavRow } from '../../../../components/NavRow';
import { StatusText } from '../../../../components/StatusText';
import { colors } from '../../../../constants/colors';
import { useGroup } from '../../../../hooks/useGroup';
import { useJoin } from '../../../../hooks/useJoin';

// Pares fundo/frente dos selos de privacidade — mesmos tons do GroupCard, para
// que "público" e "privado" tenham a mesma leitura em toda a navegação.
const PUBLIC_FG = '#1f7a44';
const PRIVATE_FG = '#4b5563';

// A faixa de "solicitação pendente" é um estado de espera, não de privacidade —
// mantém o âmbar quente mesmo com o selo "Privado" agora neutro.
const PENDING_FG = '#a8681f';

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  return `Criado em ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

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
    const message = 'Você deixará de ver os pedais e as conversas deste grupo.';

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        await leaveGroup();
      }
      return;
    }

    Alert.alert('Sair do grupo', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => leaveGroup() },
    ]);
  }

  const isPrivate = group.privacy === 'private';
  const isAdmin = membership?.role === 'admin';
  const privacyFg = isPrivate ? PRIVATE_FG : PUBLIC_FG;
  const memberLabel = `${group.members_count} ${group.members_count === 1 ? 'membro' : 'membros'}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: group.name }} />

      <View style={styles.hero}>
        <GroupImage key={group.updated_at} path={group.image_url} name={group.name} size={96} />

        <Text style={styles.name}>{group.name}</Text>

        <View style={styles.chips}>
          <View style={[styles.chip, isPrivate ? styles.chipPrivate : styles.chipPublic]}>
            <Ionicons name={isPrivate ? 'lock-closed' : 'earth'} size={12} color={privacyFg} />
            <Text style={[styles.chipText, { color: privacyFg }]}>{isPrivate ? 'Privado' : 'Público'}</Text>
          </View>

          <View style={styles.memberMeta}>
            <Ionicons name="people" size={13} color="#6b7280" />
            <Text style={styles.memberMetaText}>{memberLabel}</Text>
          </View>
        </View>

        {group.description ? <Text style={styles.description}>{group.description}</Text> : null}

        <Text style={styles.createdAt}>{formatCreatedAt(group.created_at)}</Text>
      </View>

      {membership ? (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Ionicons name={isAdmin ? 'shield-checkmark' : 'checkmark-circle'} size={18} color={colors.primary} />
          <Text style={styles.bannerText}>
            {isAdmin ? 'Você administra este grupo' : 'Você participa deste grupo'}
          </Text>
        </View>
      ) : pendingRequest ? (
        <View style={[styles.banner, styles.bannerWarning]}>
          <Ionicons name="time-outline" size={18} color={PENDING_FG} />
          <View style={styles.bannerBody}>
            <Text style={[styles.bannerText, { color: PENDING_FG }]}>Solicitação enviada</Text>
            <Text style={styles.bannerHint}>Um admin precisa aprovar sua entrada.</Text>
          </View>
        </View>
      ) : isPrivate ? (
        <Button title="Solicitar entrada" onPress={handleRequest} loading={submitting} />
      ) : (
        <Button title="Entrar no grupo" onPress={handleJoin} loading={submitting} />
      )}

      {joinError ? <StatusText variant="error">{joinError}</StatusText> : null}

      <View style={styles.card}>
        <Link href={`/groups/${group.id}/events`} asChild>
          <NavRow icon="bicycle-outline" label="Pedais" hint="Eventos agendados do grupo" onPress={() => {}} />
        </Link>

        {isAdmin ? (
          <>
            <View style={styles.divider} />
            <Link href={`/groups/${group.id}/members`} asChild>
              <NavRow icon="people-outline" label="Membros" hint="Ver e gerenciar participantes" onPress={() => {}} />
            </Link>

            <View style={styles.divider} />
            <Link href={`/groups/${group.id}/edit`} asChild>
              <NavRow
                icon="create-outline"
                label="Editar grupo"
                hint="Nome, foto, descrição e privacidade"
                onPress={() => {}}
              />
            </Link>

            {isPrivate ? (
              <>
                <View style={styles.divider} />
                <Link href={`/groups/${group.id}/requests`} asChild>
                  <NavRow
                    icon="mail-open-outline"
                    label="Solicitações"
                    hint="Aprovar pedidos de entrada"
                    onPress={() => {}}
                  />
                </Link>
              </>
            ) : null}
          </>
        ) : null}
      </View>

      {membership ? (
        <View style={styles.card}>
          <NavRow
            icon="exit-outline"
            label="Sair do grupo"
            tone="danger"
            showChevron={false}
            onPress={handleLeave}
            loading={leaving}
          />
        </View>
      ) : null}

      {leaveError ? <StatusText variant="error">{leaveError}</StatusText> : null}
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
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipPublic: {
    backgroundColor: '#e7f4ec',
  },
  chipPrivate: {
    backgroundColor: '#eceef2',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberMetaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: '#555',
    textAlign: 'center',
  },
  createdAt: {
    fontSize: 12,
    color: '#9aa0a6',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerBody: {
    flex: 1,
    gap: 1,
  },
  bannerInfo: {
    backgroundColor: '#eaf1fe',
  },
  bannerWarning: {
    backgroundColor: '#f7ecdc',
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bannerHint: {
    fontSize: 12,
    color: '#8a6d45',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ececec',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 60,
  },
});
