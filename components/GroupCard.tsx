import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { Group } from '../hooks/useGroups';
import { GroupImage } from './GroupImage';

type GroupCardProps = {
  group: Group;
};

export function GroupCard({ group }: GroupCardProps) {
  return (
    <View style={styles.container}>
      <GroupImage path={group.image_url} name={group.name} size={56} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={[styles.badge, group.privacy === 'private' && styles.badgePrivate]}>
          <Text style={styles.badgeText}>{group.privacy === 'public' ? 'Público' : 'Privado'}</Text>
        </View>
      </View>
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
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.placeholder,
  },
  badgePrivate: {
    backgroundColor: '#f0e4d0',
  },
  badgeText: {
    fontSize: 12,
    color: '#555',
  },
});
