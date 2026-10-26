import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { cardShadow, fonts, radii } from '../constants/theme';
import { EventStatus, EVENT_STATUS_LABELS } from '../hooks/useGroupEvents';
import { isPastEventDate } from '../lib/eventDates';
import { Tag, TagTone } from './Tag';

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function dateParts(dateStr: string) {
  const [, month, day] = dateStr.split('-');
  return { month: MONTHS_SHORT[Number(month) - 1] ?? '', day: String(Number(day)) };
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

// Concluído e cancelado em neutro/vermelho: o teal fica com o "agendado",
// que nem ganha tag aqui -- é o estado normal de um card de pedal.
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
  // Mantido na assinatura das telas que já passam a imagem do grupo; o card
  // do design mostra o bloco de data no lugar dela.
  groupImagePath?: string | null;
  // Omitido = não mostra a tag (ex: lista "Meus pedais", onde todo item já
  // é uma participação por definição -- a tag seria sempre igual, ruído).
  isParticipant?: boolean;
};

// Card de pedal: bloco de data à esquerda (mês/dia em terracota), título,
// "grupo · hora · ponto de encontro" e as tags de participação e status.
// Pedais que já passaram usam o card "muted", sem sombra.
export function EventRow({ title, status, eventDate, startTime, meetingPoint, groupName, isParticipant }: EventRowProps) {
  // 'cancelled' e 'completed' vindos do banco mandam; so um pedal ainda
  // 'scheduled' cuja data ja passou e promovido a concluido na exibicao --
  // assim um pedal cancelado no passado nao aparece como se tivesse rolado.
  const effectiveStatus: EventStatus =
    status === 'scheduled' && isPastEventDate(eventDate) ? 'completed' : status;
  const past = effectiveStatus !== 'scheduled';
  const { month, day } = dateParts(eventDate);
  const meta = [groupName, formatTime(startTime), meetingPoint].filter(Boolean).join(' · ');

  return (
    <View style={[styles.card, past ? styles.cardPast : styles.cardUpcoming]}>
      <View style={[styles.dateBlock, past && styles.dateBlockPast]}>
        <Text style={[styles.month, past && styles.datePast]}>{month}</Text>
        <Text style={[styles.day, past && styles.datePast]}>{day}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>

        {isParticipant !== undefined || past ? (
          <View style={styles.tags}>
            {isParticipant !== undefined && !past ? (
              <Tag
                label={isParticipant ? 'Você vai' : 'Sem confirmação'}
                tone={isParticipant ? 'green' : 'neutral'}
                size="compact"
              />
            ) : null}
            {past ? (
              <Tag label={EVENT_STATUS_LABELS[effectiveStatus]} tone={STATUS_TONES[effectiveStatus]} size="compact" />
            ) : null}
          </View>
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
    paddingVertical: 13,
  },
  dateBlock: {
    width: 46,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: palette.primaryTint,
  },
  dateBlockPast: {
    backgroundColor: palette.neutralTagTint,
  },
  month: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    letterSpacing: 0.57,
    textTransform: 'uppercase',
    color: palette.primaryInk,
  },
  day: {
    fontFamily: fonts.displayHeavy,
    fontSize: 17,
    lineHeight: 19,
    color: palette.primaryInkStrong,
  },
  datePast: {
    color: palette.neutralTag,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 14.5,
    color: palette.ink,
    marginBottom: 3,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: palette.ink,
    opacity: 0.62,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  },
});
