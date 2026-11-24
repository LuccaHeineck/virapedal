import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';

// join: fundo terracota · request: contorno terracota · pending: neutro ·
// open (já é membro): contorno teal.
export type CardPillKind = 'join' | 'request' | 'pending' | 'open';

type CardPillProps = {
  label: string;
  kind: CardPillKind;
  // Sem onPress a pílula é só visual e o toque cai no card em volta.
  onPress?: () => void;
  loading?: boolean;
};

const KINDS: Record<CardPillKind, { background: string; border: string; color: string }> = {
  join: { background: palette.primary, border: palette.primary, color: palette.onPrimary },
  request: { background: 'transparent', border: palette.primary, color: palette.primary },
  pending: { background: palette.neutralTagTint, border: palette.neutralTagTint, color: palette.neutralTag },
  open: { background: 'transparent', border: palette.teal, color: palette.teal },
};

// Botão pílula à direita dos cards de grupo.
export function CardPill({ label, kind, onPress, loading = false }: CardPillProps) {
  const { background, border, color } = KINDS[kind];
  const style = [styles.pill, { backgroundColor: background, borderColor: border }];
  const content = loading ? (
    <ActivityIndicator size="small" color={color} />
  ) : (
    <Text style={[styles.label, { color }]}>{label}</Text>
  );

  if (!onPress) {
    return <View style={style}>{content}</View>;
  }

  return (
    <TouchableOpacity style={style} onPress={onPress} disabled={loading} activeOpacity={0.8} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 36,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 12,
  },
});
