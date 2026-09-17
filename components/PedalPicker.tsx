import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { neutrals } from '../constants/colors';
import { LinkableEvent } from '../hooks/useLinkableEvents';
import { formatShortDate } from '../hooks/useRoutes';

type PedalPickerProps = {
  title: string;
  events: LinkableEvent[];
  selectedId: number | null;
  disabled?: boolean;
  onSelect: (eventId: number | null) => void;
};

// Compartilhado entre iniciar a rota e o detalhe de uma rota finalizada: dá
// para dizer de antemão em que pedal você vai, e para corrigir depois, quando
// se sabe de fato onde se esteve. A seção continua visível quando não há
// candidato -- sumir sem explicação fazia o recurso parecer inexistente.
export function PedalPicker({ title, events, selectedId, disabled, onSelect }: PedalPickerProps) {
  if (events.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.empty}>Nenhum pedal por perto nesses dias.</Text>
      </View>
    );
  }

  const options: Array<{
    id: number | null;
    title: string;
    hint: string | null;
    date: string | null;
    time: string | null;
  }> = [
    { id: null, title: 'Sozinho', hint: null, date: null, time: null },
    ...events.map((event) => ({
      id: event.id,
      title: event.title,
      hint: event.group_name || null,
      date: formatShortDate(event.event_date),
      time: event.start_time.slice(0, 5),
    })),
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.id === selectedId;
          return (
            <TouchableOpacity
              key={option.id ?? 'solo'}
              style={styles.option}
              onPress={() => onSelect(option.id)}
              disabled={disabled}
              activeOpacity={0.6}
              accessibilityRole="radio"
              accessibilityState={{ selected }}>
              <View style={[styles.mark, selected && styles.markSelected]} />
              <View style={styles.body}>
                <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={1}>
                  {option.title}
                </Text>
                {option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
              </View>
              {option.date ? (
                <View style={styles.when}>
                  <Text style={styles.date}>{option.date}</Text>
                  <Text style={styles.time}>{option.time}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Vincular a um pedal muda quem enxerga a rota (policy de SELECT de
          routes) -- isso é dito antes, não depois. */}
      {selectedId !== null ? (
        <Text style={styles.privacy}>Quem enxerga esse pedal passa a enxergar esta rota.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: neutrals.ink,
  },
  options: {
    gap: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: neutrals.hairline,
  },
  markSelected: {
    borderColor: neutrals.ink,
    borderWidth: 4.5,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: neutrals.slate,
  },
  titleSelected: {
    color: neutrals.ink,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: neutrals.mute,
    marginTop: 1,
  },
  when: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 13,
    color: neutrals.slate,
    fontVariant: ['tabular-nums'],
  },
  time: {
    fontSize: 12,
    color: neutrals.mute,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  empty: {
    fontSize: 13,
    color: neutrals.mute,
  },
  privacy: {
    fontSize: 12,
    color: neutrals.mute,
    lineHeight: 16,
  },
});
