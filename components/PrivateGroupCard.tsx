import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { PrivateGroupPreview } from '../hooks/useGroups';
import { useJoin } from '../hooks/useJoin';

type PrivateGroupCardProps = {
  group: PrivateGroupPreview;
  // Chamado depois de a solicitação ser criada, para a lista recarregar e o
  // card passar a mostrar "Solicitação enviada".
  onRequested: () => void;
};

// Mesmos tons do selo "Privado" do GroupCard e da faixa de pendência da tela
// do grupo.
const PRIVATE_FG = '#4b5563';
const PENDING_FG = '#a8681f';

// Card de um grupo privado visto por quem não é membro: só o nome, quem
// administra e o pedido de entrada -- sem foto, descrição nem membros, e sem
// link para a tela do grupo (que o RLS não deixaria carregar).
export function PrivateGroupCard({ group, onRequested }: PrivateGroupCardProps) {
  const { requestToJoin, submitting, error } = useJoin(group.id);

  async function handleRequest() {
    const ok = await requestToJoin();
    if (ok) {
      onRequested();
    }
  }

  const admins =
    group.admin_names.length === 0
      ? null
      : group.admin_names.length === 1
        ? group.admin_names[0]
        : `${group.admin_names[0]} e mais ${group.admin_names.length - 1}`;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.lockAvatar}>
          <Ionicons name="lock-closed" size={22} color={PRIVATE_FG} />
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {group.name}
            </Text>
            <View style={styles.badge}>
              <Ionicons name="lock-closed" size={11} color={PRIVATE_FG} />
              <Text style={styles.badgeText}>Privado</Text>
            </View>
          </View>

          {admins ? (
            <View style={styles.metaRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#777" />
              <Text style={styles.metaText} numberOfLines={1}>
                Admin: {admins}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {group.has_pending_request ? (
        <View style={styles.pending}>
          <Ionicons name="time-outline" size={16} color={PENDING_FG} />
          <Text style={styles.pendingText}>Solicitação enviada</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.requestButton, submitting && styles.requestButtonDisabled]}
          onPress={handleRequest}
          disabled={submitting}
          accessibilityRole="button">
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.requestButtonText}>Solicitar entrada</Text>
          )}
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ececec',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eceef2',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#eceef2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIVATE_FG,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 13,
    color: '#777',
  },
  requestButton: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#f7ecdc',
  },
  pendingText: {
    color: PENDING_FG,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    fontSize: 13,
  },
});
