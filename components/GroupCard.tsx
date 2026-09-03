import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Group } from '../hooks/useGroups';
import { GroupImage } from './GroupImage';

type GroupCardProps = {
  group: Group;
};

export function GroupCard({ group }: GroupCardProps) {
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

          <View style={[styles.badge, isPrivate ? styles.badgePrivate : styles.badgePublic]}>
            <Ionicons
              name={isPrivate ? 'lock-closed' : 'earth'}
              size={11}
              color={isPrivate ? PRIVATE_FG : PUBLIC_FG}
            />
            <Text style={[styles.badgeText, { color: isPrivate ? PRIVATE_FG : PUBLIC_FG }]}>
              {isPrivate ? 'Privado' : 'Público'}
            </Text>
          </View>
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
          <Ionicons name="people-outline" size={14} color="#777" />
          <Text style={styles.metaText}>{memberLabel}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#c4c4c4" />
    </View>
  );
}

// Pares fundo/frente dos selos de privacidade — tons suaves o suficiente para
// não competir com o nome do grupo, mas distintos para leitura rápida na lista.
// Verde = "acesso livre"; ardósia neutra = "restrito" sem gritar, deixando o
// azul livre para elementos interativos.
const PUBLIC_FG = '#1f7a44';
const PRIVATE_FG = '#4b5563';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  badgePublic: {
    backgroundColor: '#e7f4ec',
  },
  badgePrivate: {
    backgroundColor: '#eceef2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: '#666',
  },
  descriptionEmpty: {
    color: '#aaa',
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: '#777',
  },
});
