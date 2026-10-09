import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { GroupMemberRow } from '../hooks/useGroupMembers';
import { Avatar } from './Avatar';

type MemberRowProps = {
  member: GroupMemberRow;
  isViewerAdmin: boolean;
  // false quando este é o único admin do grupo: rebaixá-lo deixaria o grupo
  // sem administrador (o banco também recusa, ver migration de sucessão).
  canDemote?: boolean;
  // A própria linha de quem está vendo: sem "Remover" -- sair passa pelo
  // "Sair do grupo", que trata a sucessão de admin.
  isViewer?: boolean;
  onToggleRole: () => void;
  onRemove: () => void;
};

export function MemberRow({ member, isViewerAdmin, canDemote = true, isViewer = false, onToggleRole, onRemove }: MemberRowProps) {
  const name = member.users?.name ?? 'Usuário';
  const photoUrl = member.users?.profile_photo_url ?? null;
  const showRoleAction = !(member.role === 'admin' && !canDemote);
  const showRemove = !isViewer;

  return (
    <View style={styles.container}>
      <Avatar photo={photoUrl} name={name} size={44} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.role}>{member.role === 'admin' ? 'Admin' : 'Membro'}</Text>
      </View>

      {isViewerAdmin && (showRoleAction || showRemove) ? (
        <View style={styles.actions}>
          {!showRoleAction ? null : (
            <TouchableOpacity onPress={onToggleRole}>
              <Text style={styles.actionText}>{member.role === 'admin' ? 'Rebaixar' : 'Promover'}</Text>
            </TouchableOpacity>
          )}
          {showRemove ? (
            <TouchableOpacity onPress={onRemove}>
              <Text style={[styles.actionText, styles.removeText]}>Remover</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  role: {
    fontSize: 13,
    color: '#666',
  },
  actions: {
    gap: 6,
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  removeText: {
    color: colors.error,
  },
});
