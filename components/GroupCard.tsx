import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { cardShadow, fonts, radii } from '../constants/theme';
import { Group } from '../hooks/useGroups';
import { GroupImage } from './GroupImage';
import { PendingRequestsBadge } from './PendingRequestsBadge';
import { Tag } from './Tag';

type GroupCardProps = {
  group: Group;
  // Mostra o selo "Admin" -- mesmo escudo do banner "Você administra este
  // grupo" na tela do grupo.
  isAdmin?: boolean;
  // Solicitações de entrada aguardando aprovação (só chega > 0 para admins).
  pendingRequests?: number;
};

export function GroupCard({ group, isAdmin = false, pendingRequests = 0 }: GroupCardProps) {
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

          {/* Teal = "acesso livre"; neutro = "restrito" sem gritar, deixando o
              terracota para elementos interativos. */}
          <Tag
            label={isPrivate ? 'Privado' : 'Público'}
            tone={isPrivate ? 'neutral' : 'teal'}
            icon={isPrivate ? 'lock-closed' : 'earth'}
            size="compact"
          />
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
          <Ionicons name="people-outline" size={14} color={palette.inkSecondary} />
          <Text style={styles.metaText}>{memberLabel}</Text>

          {isAdmin ? (
            <Tag label="Admin" tone="primary" icon="shield-checkmark" size="compact" style={styles.adminTag} />
          ) : null}

          <PendingRequestsBadge count={pendingRequests} />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={palette.inkInactive} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    ...cardShadow,
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
  description: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17.5,
    color: palette.ink,
    opacity: 0.72,
  },
  descriptionEmpty: {
    fontStyle: 'italic',
    opacity: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.inkSecondary,
  },
  adminTag: {
    marginLeft: 4,
  },
});
