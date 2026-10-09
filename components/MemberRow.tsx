import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { GroupMemberRow } from '../hooks/useGroupMembers';
import { Avatar } from './Avatar';

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function memberSince(iso: string): string {
  const date = new Date(iso);
  return `Membro desde ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

type MemberRowProps = {
  member: GroupMemberRow;
  // A própria linha de quem está vendo: ganha o "(você)" ao lado do nome.
  isViewer?: boolean;
  // Abre o menu de ações do admin; ausente = linha sem botão "⋯" (quem não é
  // admin, ou um membro sobre o qual não há ação possível).
  onOpenMenu?: () => void;
  // Uma ação sobre este membro está em andamento.
  busy?: boolean;
};

// Linha da lista de membros: foto, nome, papel e desde quando participa. As
// ações do admin (promover, rebaixar, remover) ficam atrás do "⋯", em vez de
// links soltos na linha.
export function MemberRow({ member, isViewer = false, onOpenMenu, busy = false }: MemberRowProps) {
  const name = member.users?.name ?? 'Usuário';
  const isAdmin = member.role === 'admin';

  return (
    <View style={styles.container}>
      <Avatar photo={member.users?.profile_photo_url ?? null} name={name} size={44} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
            {isViewer ? <Text style={styles.you}> (você)</Text> : null}
          </Text>
          {isAdmin ? (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{memberSince(member.joined_at)}</Text>
      </View>

      {busy ? (
        <ActivityIndicator color={colors.primary} style={styles.menuButton} />
      ) : onOpenMenu ? (
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onOpenMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Ações para ${name}`}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
        </TouchableOpacity>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  you: {
    fontWeight: '400',
    color: '#888',
  },
  // Mesmo selo "Admin" do card da lista de grupos.
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#eaf1fe',
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  meta: {
    fontSize: 13,
    color: '#666',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f6f8',
  },
});
