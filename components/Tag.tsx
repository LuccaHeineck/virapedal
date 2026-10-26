import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';

export type TagTone = 'green' | 'amber' | 'neutral' | 'teal' | 'primary' | 'error';

type TagProps = {
  label: string;
  tone: TagTone;
  icon?: keyof typeof Ionicons.glyphMap;
  // compact: tag de RSVP no card de pedal (10.5/700, padding 3×8).
  size?: 'regular' | 'compact';
  style?: StyleProp<ViewStyle>;
};

// Pares fundo/frente das tags de status do design:
// confirmado → verde · talvez/pendente → âmbar · recusado/concluído/privado →
// neutro · agendado/público → teal.
export const TAG_TONES: Record<TagTone, { background: string; color: string }> = {
  green: { background: palette.greenTint, color: palette.green },
  amber: { background: palette.amberTint, color: palette.amber },
  neutral: { background: palette.neutralTagTint, color: palette.neutralTag },
  teal: { background: palette.tealTint, color: palette.teal },
  primary: { background: palette.primaryTint, color: palette.primaryInk },
  error: { background: palette.errorTint, color: palette.error },
};

export function Tag({ label, tone, icon, size = 'regular', style }: TagProps) {
  const { background, color } = TAG_TONES[tone];
  const compact = size === 'compact';

  return (
    <View style={[styles.tag, compact && styles.compact, { backgroundColor: background }, style]}>
      {icon ? <Ionicons name={icon} size={compact ? 10 : 11} color={color} /> : null}
      <Text style={[styles.text, compact && styles.textCompact, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
  },
  textCompact: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
  },
});
