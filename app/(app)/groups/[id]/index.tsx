import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../../components/Avatar';
import { AvatarStack } from '../../../../components/AvatarStack';
import { Button } from '../../../../components/Button';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { GroupImage } from '../../../../components/GroupImage';
import { LoadingView } from '../../../../components/LoadingView';
import { NavRow } from '../../../../components/NavRow';
import { PendingRequestsBadge } from '../../../../components/PendingRequestsBadge';
import { StatusText } from '../../../../components/StatusText';
import { colors } from '../../../../constants/colors';
import { useGroup } from '../../../../hooks/useGroup';
import { GroupMemberRow, useGroupMembers } from '../../../../hooks/useGroupMembers';
import { useGroupMutations } from '../../../../hooks/useGroupMutations';
import { useJoin } from '../../../../hooks/useJoin';
import { useJoinRequests } from '../../../../hooks/useJoinRequests';

// Pares fundo/frente dos selos de privacidade — mesmos tons do GroupCard, para
// que "público" e "privado" tenham a mesma leitura em toda a navegação.
const PUBLIC_FG = '#1f7a44';
const PRIVATE_FG = '#4b5563';

// Fundo do botão de rostos no cabeçalho; também é a cor do anel das fotos,
// para que ele separe as sobrepostas sem desenhar contorno.
const FACES_BG = '#f5f6f8';

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
  // Para a saída do último admin: quem pode herdar o cargo. Para quem não é
  // membro o RLS devolve lista vazia, que aqui não é usada.
  const { members, refresh: refreshMembers, changeRole, mutationError: promoteError } = useGroupMembers(groupId);
  // Pendências para o botão "Solicitações". O RLS só mostra as do grupo a
  // admins; para os demais a lista volta vazia e o selo não aparece.
  const { requests: pendingRequests, refresh: refreshRequests } = useJoinRequests(groupId);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [successorId, setSuccessorId] = useState<number | null>(null);
  const [pickingSuccessor, setPickingSuccessor] = useState(false);
  const [promoting, setPromoting] = useState(false);
  // Fixado ao abrir o diálogo: depois da promoção a lista recarrega com dois
  // admins e needsSuccessor viraria false no meio da saída, trocando o texto.
  const [leavingAsLastAdmin, setLeavingAsLastAdmin] = useState(false);
  // Último membro saindo: o grupo ficaria vazio, então sair = excluir o grupo.
  // Também fixado ao abrir o diálogo, pelo mesmo motivo do de cima.
  const [leavingAsLastMember, setLeavingAsLastMember] = useState(false);
  const { deleteGroup, deleting, deleteError } = useGroupMutations();
  const router = useRouter();

  // Voltar para cá depois de editar, entrar/sair ou gerenciar membros (a
  // instância desta tela na pilha permanece montada) não dispararia o
  // useEffect de busca do useGroup novamente sem isto.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshMembers();
      refreshRequests();
    }, [refresh, refreshMembers, refreshRequests])
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

  const isPrivate = group.privacy === 'private';
  const isAdmin = membership?.role === 'admin';

  // O último admin só sai passando o cargo adiante. A sugestão é o membro
  // mais antigo (members já vem por joined_at) -- a mesma escolha que o banco
  // faria sozinho --, mas o admin pode trocar por qualquer outro membro.
  const otherMembers = members.filter((member) => member.user_id !== membership?.user_id);
  const otherAdmins = otherMembers.filter((member) => member.role === 'admin');
  const needsSuccessor = isAdmin && otherAdmins.length === 0 && otherMembers.length > 0;
  const successor: GroupMemberRow | undefined =
    otherMembers.find((member) => member.id === successorId) ?? otherMembers[0];

  function openLeaveDialog() {
    setSuccessorId(null);
    setPickingSuccessor(false);
    setLeavingAsLastAdmin(needsSuccessor);
    // members_count vem da própria linha do grupo (já carregada), em vez da
    // lista de membros -- que, se ainda estivesse carregando, pareceria vazia
    // e faria o diálogo anunciar uma exclusão que não aconteceria.
    setLeavingAsLastMember(group?.members_count === 1);
    setLeaveDialogOpen(true);
  }

  async function handleConfirmLeave() {
    if (leavingAsLastMember) {
      // Quem sobra sozinho é admin (a sucessão do banco garante), e a policy
      // de DELETE em groups libera para admins; o cascade leva pedais,
      // participações e solicitações junto.
      const deleted = await deleteGroup(groupId);
      if (!deleted) {
        return;
      }
      // Fecha antes de navegar: esta tela continua na pilha durante o
      // dismissAll, e um Modal visível ficaria sobreposto na lista.
      setLeaveDialogOpen(false);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      return;
    }

    if (leavingAsLastAdmin && successor) {
      // Promove antes de sair: se a promoção falhar, a pessoa continua no
      // grupo e o diálogo fica aberto mostrando o erro.
      setPromoting(true);
      const promoted = await changeRole(successor.id, 'admin');
      setPromoting(false);
      if (!promoted) {
        return;
      }
    }

    await leaveGroup();
    setLeaveDialogOpen(false);
  }
  const privacyFg = isPrivate ? PRIVATE_FG : PUBLIC_FG;
  const memberLabel = `${group.members_count} ${group.members_count === 1 ? 'membro' : 'membros'}`;
  const showFaces = !!membership && members.length > 0;

  // Quem tem foto vem primeiro, porque rostos se reconhecem melhor que
  // iniciais; o resto segue a ordem de entrada no grupo. Você entra na mesma
  // regra que os demais (a frase diz "Você", então seu rosto pode aparecer),
  // sem posição reservada.
  const byPhotoFirst = (a: GroupMemberRow, b: GroupMemberRow) =>
    Number(!a.users?.profile_photo_url) - Number(!b.users?.profile_photo_url);
  const others = members.filter((member) => member.user_id !== membership?.user_id).sort(byPhotoFirst);
  const facePeople = [...members].sort(byPhotoFirst).slice(0, 3).map((member) => ({
    key: member.id,
    name: member.users?.name ?? 'Usuário',
    photo: member.users?.profile_photo_url ?? null,
  }));

  // Primeiro nome só: a frase cabe em uma linha e soa como nas redes sociais.
  const firstName = (member: GroupMemberRow) => (member.users?.name ?? 'Usuário').trim().split(/\s+/)[0];
  const facesSentence = (() => {
    const total = group.members_count;
    if (others.length === 0) {
      return 'Só você por enquanto';
    }
    if (total <= 2) {
      return `Você e ${firstName(others[0])}`;
    }
    if (total === 3 && others.length >= 2) {
      return `Você, ${firstName(others[0])} e ${firstName(others[1])}`;
    }
    return `Você, ${firstName(others[0])} e mais ${total - 2}`;
  })();

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

          {/* Quem é membro vê a linha de rostos logo abaixo, que já diz
              quantos são; quem não é (a lista de membros é restrita pelo RLS)
              fica só com a contagem aqui. */}
          {showFaces ? null : (
            <View style={styles.memberMeta}>
              <Ionicons name="people" size={13} color="#6b7280" />
              <Text style={styles.memberMetaText}>{memberLabel}</Text>
            </View>
          )}
        </View>

        {/* Linha de rostos, no padrão "Seguido por Ana, Bruno e mais 6" das
            redes sociais: algumas fotos sobrepostas e os nomes de quem está
            ali. Tocar abre a lista completa. */}
        {showFaces ? (
          <Link href={`/groups/${group.id}/members`} asChild>
            <TouchableOpacity
              style={styles.faces}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={`${memberLabel}. Ver membros`}>
              <AvatarStack
                people={facePeople}
                total={group.members_count}
                max={3}
                size={30}
                overflowStyle="fade"
                ringColor={FACES_BG}
              />
              <Text style={styles.facesText} numberOfLines={2}>
                {facesSentence}
              </Text>
            </TouchableOpacity>
          </Link>
        ) : null}

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

        {/* Qualquer membro vê a lista (o RLS de group_members já restringe a
            leitura a membros); só o admin ganha os controles de gestão, que
            members.tsx esconde para os demais. */}
        {membership ? (
          <>
            <View style={styles.divider} />
            <Link href={`/groups/${group.id}/members`} asChild>
              <NavRow
                icon="people-outline"
                label="Membros"
                hint={isAdmin ? 'Ver e gerenciar participantes' : 'Ver quem participa do grupo'}
                onPress={() => {}}
              />
            </Link>
          </>
        ) : null}

        {isAdmin ? (
          <>
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
                    hint="Verificar solicitações de entrada"
                    badge={<PendingRequestsBadge count={pendingRequests.length} />}
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
            onPress={openLeaveDialog}
            loading={leaving}
          />
        </View>
      ) : null}

      {leaveError ? <StatusText variant="error">{leaveError}</StatusText> : null}

      <ConfirmDialog
        visible={leaveDialogOpen}
        icon="exit-outline"
        title={leavingAsLastMember ? 'Sair e excluir o grupo?' : 'Sair do grupo?'}
        message={
          leavingAsLastMember
            ? 'Você é o único membro. Ao sair, o grupo será excluído junto com todos os seus pedais. Esta ação não pode ser desfeita.'
            : leavingAsLastAdmin
              ? 'Você é o único administrador. Ao sair, outro membro passa a administrar o grupo.'
              : 'Você deixará de ver os pedais e as conversas deste grupo.'
        }
        confirmLabel={leavingAsLastMember ? 'Sair e excluir' : 'Sair'}
        onConfirm={handleConfirmLeave}
        onCancel={() => setLeaveDialogOpen(false)}
        loading={promoting || leaving || deleting}>
        {leavingAsLastMember && deleteError ? <StatusText variant="error">{deleteError}</StatusText> : null}
        {leavingAsLastAdmin && successor ? (
          <View style={styles.successorBox}>
            <Text style={styles.successorLabel}>Novo administrador</Text>
            <View style={styles.successorRow}>
              <Avatar photo={successor.users?.profile_photo_url ?? null} name={successor.users?.name ?? 'Usuário'} size={36} />
              <Text style={styles.successorName} numberOfLines={1}>
                {successor.users?.name ?? 'Usuário'}
              </Text>
              {otherMembers.length > 1 ? (
                <TouchableOpacity
                  onPress={() => setPickingSuccessor((open) => !open)}
                  disabled={promoting || leaving}
                  hitSlop={8}
                  accessibilityRole="button">
                  <Text style={styles.successorChange}>{pickingSuccessor ? 'Fechar' : 'Alterar'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {pickingSuccessor ? (
              <ScrollView style={styles.successorList} nestedScrollEnabled>
                {otherMembers.map((member) => {
                  const selected = member.id === successor.id;
                  const name = member.users?.name ?? 'Usuário';
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.successorOption}
                      onPress={() => {
                        setSuccessorId(member.id);
                        setPickingSuccessor(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}>
                      <Avatar photo={member.users?.profile_photo_url ?? null} name={name} size={32} />
                      <Text style={styles.successorOptionName} numberOfLines={1}>
                        {name}
                      </Text>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selected ? colors.primary : '#c4c8cf'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {promoteError ? <StatusText variant="error">{promoteError}</StatusText> : null}
          </View>
        ) : null}
      </ConfirmDialog>
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
    gap: 6,
  },
  memberMetaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  // A margem da esquerda é igual à de cima/baixo: assim a primeira foto fica
  // concêntrica com a ponta arredondada do botão, em vez de colada nela.
  faces: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: FACES_BG,
  },
  facesText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
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
  successorBox: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: '#fafafa',
  },
  successorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  successorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successorName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  successorChange: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  successorList: {
    maxHeight: 220,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
  },
  successorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  successorOptionName: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
});
