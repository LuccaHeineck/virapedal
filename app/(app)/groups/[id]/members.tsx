import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ActionSheet, ActionSheetOption } from '../../../../components/ActionSheet';
import { Avatar } from '../../../../components/Avatar';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { LoadingView } from '../../../../components/LoadingView';
import { MemberRow } from '../../../../components/MemberRow';
import { StatusText } from '../../../../components/StatusText';
import { colors } from '../../../../constants/colors';
import { useAuth } from '../../../../context/AuthContext';
import { GroupMemberRow, useGroupMembers } from '../../../../hooks/useGroupMembers';

export default function GroupMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const { user } = useAuth();
  const { members, loading, error, removeMember, changeRole, mutationError } = useGroupMembers(groupId);

  // Membro cujo menu "⋯" está aberto, membro aguardando confirmação de
  // remoção e membro com uma ação em andamento (spinner na linha).
  const [menuMember, setMenuMember] = useState<GroupMemberRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<GroupMemberRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // O papel de quem vê sai da própria lista, que é recarregada após cada
  // mudança de papel -- assim, ao se rebaixar, os controles somem na hora
  // (antes vinham do useGroup, que só recarregava ao reabrir a tela).
  const viewerMember = members.find((member) => member.user_id === user?.id);
  const isAdmin = viewerMember?.role === 'admin';
  // Um admin só pode ser rebaixado se sobrar outro admin no grupo.
  const adminCount = members.filter((member) => member.role === 'admin').length;

  // Admins primeiro, depois a ordem de entrada -- quem gerencia o grupo fica
  // no topo, como nas listas de membros de outros apps.
  const sortedMembers = [...members].sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin'));

  async function run(member: GroupMemberRow, action: () => Promise<boolean>) {
    setBusyId(member.id);
    await action();
    setBusyId(null);
  }

  // Ações possíveis do admin sobre um membro. Na própria linha não há
  // "Remover" (sair passa pelo "Sair do grupo", que trata a sucessão) e o
  // "Deixar de ser admin" só existe se sobrar outro admin.
  function optionsFor(member: GroupMemberRow): ActionSheetOption[] {
    const isSelf = member.user_id === user?.id;
    const memberIsAdmin = member.role === 'admin';
    const options: ActionSheetOption[] = [];

    if (!memberIsAdmin) {
      options.push({
        key: 'promote',
        label: 'Tornar administrador',
        icon: 'shield-checkmark-outline',
        onPress: () => run(member, () => changeRole(member.id, 'admin')),
      });
    } else if (adminCount > 1) {
      options.push({
        key: 'demote',
        label: isSelf ? 'Deixar de ser administrador' : 'Remover como administrador',
        icon: 'shield-outline',
        onPress: () => run(member, () => changeRole(member.id, 'member')),
      });
    }

    if (!isSelf) {
      options.push({
        key: 'remove',
        label: 'Remover do grupo',
        icon: 'person-remove-outline',
        tone: 'danger',
        onPress: () => setRemoveTarget(member),
      });
    }

    return options;
  }

  async function handleConfirmRemove() {
    if (!removeTarget) {
      return;
    }
    const target = removeTarget;
    setRemoveTarget(null);
    await run(target, () => removeMember(target.id));
  }

  if (loading) {
    return <LoadingView />;
  }

  const menuName = menuMember?.users?.name ?? 'Usuário';

  return (
    <View style={styles.container}>
      {mutationError ? (
        <View style={styles.errorBanner}>
          <StatusText variant="error">{mutationError}</StatusText>
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={sortedMembers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            members.length > 0 ? (
              <Text style={styles.header}>
                {members.length === 1 ? '1 membro' : `${members.length} membros`}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const hasActions = isAdmin && optionsFor(item).length > 0;
            return (
              <MemberRow
                member={item}
                isViewer={item.user_id === user?.id}
                busy={busyId === item.id}
                onOpenMenu={hasActions && busyId === null ? () => setMenuMember(item) : undefined}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhum membro encontrado.</Text>
            </View>
          }
        />
      )}

      <ActionSheet
        visible={menuMember !== null}
        onClose={() => setMenuMember(null)}
        options={menuMember ? optionsFor(menuMember) : []}
        header={
          menuMember ? (
            <View style={styles.sheetHeader}>
              <Avatar photo={menuMember.users?.profile_photo_url ?? null} name={menuName} size={36} />
              <Text style={styles.sheetName} numberOfLines={1}>
                {menuName}
              </Text>
            </View>
          ) : null
        }
      />

      <ConfirmDialog
        visible={removeTarget !== null}
        icon="person-remove-outline"
        title="Remover do grupo?"
        message={`${removeTarget?.users?.name ?? 'Este membro'} deixará de ver os pedais do grupo. Para voltar, precisará entrar de novo.`}
        confirmLabel="Remover"
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexGrow: 1,
  },
  header: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    paddingBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  errorBanner: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});
