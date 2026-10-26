import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, palette } from '../constants/colors';
import { cardShadow, fonts, radii } from '../constants/theme';
import { PrivateGroupPreview } from '../hooks/useGroups';
import { useJoin } from '../hooks/useJoin';
import { CardPill } from './CardPill';

type PrivateGroupCardProps = {
  group: PrivateGroupPreview;
  // Chamado depois de a solicitação ser criada, para a lista recarregar e o
  // card passar a mostrar "Solicitado".
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
          <Ionicons name="lock-closed-outline" size={22} color={palette.inkSecondary} />
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {group.name}
            </Text>
            <Ionicons name="lock-closed-outline" size={12} color={palette.inkSecondary} accessibilityLabel="Privado" />
          </View>

          <Text style={styles.description}>Grupo privado. Um admin aprova quem entra.</Text>

          {admins ? (
            <Text style={styles.metaText} numberOfLines={1}>
              Admin: {admins}
            </Text>
          ) : null}
        </View>

        {group.has_pending_request ? (
          <CardPill label="Solicitado" kind="pending" />
        ) : (
          <CardPill label="Solicitar" kind="request" onPress={handleRequest} loading={submitting} />
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: palette.ink,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17.5,
    color: palette.ink,
    opacity: 0.72,
    marginBottom: 7,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.ink,
    opacity: 0.55,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.error,
    fontSize: 12.5,
  },
});
