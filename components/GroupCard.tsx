import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { cardShadow, fonts, radii } from '../constants/theme';
import { Group } from '../hooks/useGroups';
import { GroupImage } from './GroupImage';
import { PendingRequestsBadge } from './PendingRequestsBadge';
import { CardPill } from './CardPill';
import { Tag } from './Tag';

type GroupCardProps = {
  group: Group;
  // Mostra o selo "Admin".
  isAdmin?: boolean;
  // Solicitações de entrada aguardando aprovação (só chega > 0 para admins).
  pendingRequests?: number;
  // "Meus grupos" ganha o "Abrir" teal; "Descobrir", o "Ver" terracota.
  isMember?: boolean;
};

// O card inteiro abre o grupo; a pílula à direita só repete a ação para
// deixar claro o que o toque faz.
export function GroupCard({ group, isAdmin = false, pendingRequests = 0, isMember = true }: GroupCardProps) {
  const isPrivate = group.privacy === 'private';
  const memberLabel = `${group.members_count} ${group.members_count === 1 ? 'membro' : 'membros'}`;

  return (
    <View style={styles.card}>
      <GroupImage path={group.image_url} name={group.name} size={56} />

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          {isPrivate ? (
            <Ionicons name="lock-closed-outline" size={12} color={palette.inkSecondary} accessibilityLabel="Privado" />
          ) : null}
        </View>

        {group.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {group.description}
          </Text>
        ) : (
          <Text style={[styles.description, styles.descriptionEmpty]} numberOfLines={1}>
            Sem descrição
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{memberLabel}</Text>
          {isAdmin ? <Tag label="Admin" tone="primary" size="compact" /> : null}
          <PendingRequestsBadge count={pendingRequests} />
        </View>
      </View>

      <CardPill label={isMember ? 'Abrir' : 'Ver'} kind={isMember ? 'open' : 'join'} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    ...cardShadow,
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
  descriptionEmpty: {
    fontStyle: 'italic',
    opacity: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.ink,
    opacity: 0.55,
  },
});
