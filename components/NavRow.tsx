import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, palette } from '../constants/colors';
import { fonts } from '../constants/theme';

type NavRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  loading?: boolean;
  // Elemento pequeno à direita, antes da seta (ex.: contador de pendências).
  badge?: ReactNode;
};

export function NavRow({ icon, label, hint, onPress, tone = 'default', showChevron = true, loading, badge }: NavRowProps) {
  const danger = tone === 'danger';
  const accent = danger ? colors.error : colors.primary;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={loading} activeOpacity={0.6}>
      <View style={[styles.iconWrap, danger ? styles.iconWrapDanger : styles.iconWrapDefault]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>

      <View style={styles.text}>
        <Text style={[styles.label, danger && styles.labelDanger]} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>

      {badge}

      {loading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={palette.border} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDefault: {
    backgroundColor: palette.primaryTint,
  },
  iconWrapDanger: {
    backgroundColor: palette.errorTint,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 14.5,
    fontFamily: fonts.display,
    color: palette.ink,
  },
  labelDanger: {
    color: colors.error,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.inkInactive,
  },
});
