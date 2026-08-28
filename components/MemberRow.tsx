import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { GroupMemberRow } from '../hooks/useGroupMembers';

type MemberRowProps = {
  member: GroupMemberRow;
  isViewerAdmin: boolean;
  onToggleRole: () => void;
  onRemove: () => void;
};

export function MemberRow({ member, isViewerAdmin, onToggleRole, onRemove }: MemberRowProps) {
  const name = member.users?.name ?? 'Usuário';
  const photoUrl = member.users?.profile_photo_url ?? null;

  return (
    <View style={styles.container}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>{name.charAt(0).toUpperCase() || '?'}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.role}>{member.role === 'admin' ? 'Admin' : 'Membro'}</Text>
      </View>

      {isViewerAdmin ? (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onToggleRole}>
            <Text style={styles.actionText}>{member.role === 'admin' ? 'Rebaixar' : 'Promover'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove}>
            <Text style={[styles.actionText, styles.removeText]}>Remover</Text>
          </TouchableOpacity>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.placeholder,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontWeight: '600',
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
