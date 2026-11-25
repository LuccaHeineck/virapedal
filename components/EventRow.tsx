import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { cardShadow, fonts, radii } from '../constants/theme';
import { EventStatus, EVENT_STATUS_LABELS } from '../hooks/useGroupEvents';
import { isPastEventDate } from '../lib/eventDates';
import { GroupImage } from './GroupImage';
import { Tag, TagTone } from './Tag';

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

// 'completed' usa neutro de proposito: verde fica reservado ao badge de
// "Participando", que significa outra coisa -- dois badges verdes na mesma
// linha confundiam a leitura.
const STATUS_TONES: Record<EventStatus, TagTone> = {
  scheduled: 'teal',
  completed: 'neutral',
  cancelled: 'error',
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

// Card de pedal. Pedais que já passaram usam o card "muted", sem sombra.
export function EventRow({ title, status, eventDate, startTime, meetingPoint, groupName, groupImagePath, isParticipant }: EventRowProps) {
  // 'cancelled' e 'completed' vindos do banco mandam; so um pedal ainda
  // 'scheduled' cuja data ja passou e promovido a concluido na exibicao --
  // assim um pedal cancelado no passado nao aparece como se tivesse rolado.
  const effectiveStatus: EventStatus =
    status === 'scheduled' && isPastEventDate(eventDate) ? 'completed' : status;
  const past = effectiveStatus !== 'scheduled';

  return (
    <View style={[styles.card, past ? styles.cardPast : styles.cardUpcoming]}>
      <GroupImage path={groupImagePath} name={groupName} size={44} />

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {past ? (
            <Tag
              label={EVENT_STATUS_LABELS[effectiveStatus]}
              tone={STATUS_TONES[effectiveStatus]}
              size="compact"
              style={styles.statusTag}
            />
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={palette.inkSecondary} />
          <Text style={styles.meta}>
            {formatDate(eventDate)} às {formatTime(startTime)} · {groupName}
          </Text>
        </View>

        {meetingPoint ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={palette.inkSecondary} />
            <Text style={styles.meta}>{meetingPoint}</Text>
          </View>
        ) : null}

        {isParticipant !== undefined ? (
          <Tag
            label={isParticipant ? 'Participando' : 'Não participando'}
            tone={isParticipant ? 'green' : 'neutral'}
            icon={isParticipant ? 'checkmark-circle' : 'ellipse-outline'}
            size="compact"
            style={styles.participationTag}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radii.card,
  },
  cardUpcoming: {
    backgroundColor: palette.surface,
    ...cardShadow,
  },
  cardPast: {
    backgroundColor: palette.surfaceMuted,
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
  title: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 14.5,
    color: palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: palette.inkSecondary,
  },
  // Empurra o badge para a borda direita: sem isto ele fica colado ao fim
  // do titulo e a coluna de badges vira um serrilhado, porque cada pedal
  // tem um nome de tamanho diferente.
  statusTag: {
    marginLeft: 'auto',
  },
  participationTag: {
    marginTop: 3,
  },
});
