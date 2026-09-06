import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { EventStatus, EVENT_STATUS_LABELS } from '../hooks/useGroupEvents';
import { GroupImage } from './GroupImage';

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

const STATUS_COLORS: Record<EventStatus, { background: string; text: string }> = {
  scheduled: { background: '#e3ecfd', text: colors.primary },
  completed: { background: '#e1f3e8', text: colors.success },
  cancelled: { background: '#f5e2e0', text: colors.error },
};

type EventRowProps = {
  title: string;
  status: EventStatus;
  eventDate: string;
  startTime: string;
  meetingPoint: string | null;
  groupName: string;
  groupImagePath: string | null;
  // Omitido = não mostra o badge (ex: lista "Meus pedais", onde todo item já
  // é uma participação por definição -- o badge seria sempre igual, ruído).
  isParticipant?: boolean;
};

export function EventRow({ title, status, eventDate, startTime, meetingPoint, groupName, groupImagePath, isParticipant }: EventRowProps) {
  const statusColors = STATUS_COLORS[status];

  return (
    <View style={styles.container}>
      <GroupImage path={groupImagePath} name={groupName} size={44} />

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {status !== 'scheduled' ? (
            <View style={[styles.badge, { backgroundColor: statusColors.background }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>{EVENT_STATUS_LABELS[status]}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color="#666" />
          <Text style={styles.meta}>
            {formatDate(eventDate)} às {formatTime(startTime)} · {groupName}
          </Text>
        </View>

        {meetingPoint ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color="#666" />
            <Text style={styles.meta}>{meetingPoint}</Text>
          </View>
        ) : null}

        {isParticipant !== undefined ? (
          <View style={[styles.badge, styles.participationBadge, isParticipant ? styles.participatingBadge : styles.notParticipatingBadge]}>
            <Ionicons
              name={isParticipant ? 'checkmark-circle' : 'ellipse-outline'}
              size={12}
              color={isParticipant ? colors.success : '#888'}
            />
            <Text style={[styles.badgeText, { color: isParticipant ? colors.success : '#888' }]}>
              {isParticipant ? 'Participando' : 'Não participando'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    fontSize: 14,
    color: '#666',
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  participationBadge: {
    marginTop: 2,
  },
  participatingBadge: {
    backgroundColor: '#e1f3e8',
  },
  notParticipatingBadge: {
    backgroundColor: colors.placeholder,
  },
});
