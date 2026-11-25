import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, palette } from '../constants/colors';
import { cardShadow, fonts, radii } from '../constants/theme';
import { PrivateGroupPreview } from '../hooks/useGroups';
import { useJoin } from '../hooks/useJoin';
import { Tag } from './Tag';

type PrivateGroupCardProps = {
  group: PrivateGroupPreview;
  // Chamado depois de a solicitação ser criada, para a lista recarregar e o
  // card passar a mostrar "Solicitação enviada".
  onRequested: () => void;
};

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
        <View style={styles.lockThumb}>
          <Ionicons name="lock-closed" size={22} color={palette.inkSecondary} />
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {group.name}
            </Text>
            <Tag label="Privado" tone="neutral" icon="lock-closed" size="compact" />
          </View>

          {admins ? (
            <View style={styles.metaRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={palette.inkSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                Admin: {admins}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {group.has_pending_request ? (
        <View style={styles.pending}>
          <Ionicons name="time-outline" size={16} color={palette.amber} />
          <Text style={styles.pendingText}>Solicitação enviada</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.requestButton, submitting && styles.requestButtonDisabled]}
          onPress={handleRequest}
          disabled={submitting}
          activeOpacity={0.8}
          accessibilityRole="button">
          {submitting ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
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
    padding: 14,
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Quadrado como as thumbs de grupo (GroupImage).
  lockThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.neutralTagTint,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.inkSecondary,
  },
  requestButton: {
    minHeight: 42,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  requestButtonDisabled: {
    opacity: 0.5,
  },
  requestButtonText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: palette.onPrimary,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: radii.button,
    backgroundColor: palette.amberTint,
  },
  pendingText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: palette.amber,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.error,
    fontSize: 12.5,
  },
});
