import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

type NavRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  loading?: boolean;
};

export function NavRow({ icon, label, hint, onPress, tone = 'default', showChevron = true, loading }: NavRowProps) {
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

      {loading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={18} color="#c4c4c4" />
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
    backgroundColor: '#eaf1fe',
  },
  iconWrapDanger: {
    backgroundColor: '#fdecea',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  labelDanger: {
    color: colors.error,
  },
  hint: {
    fontSize: 12,
    color: '#8a8f98',
  },
});
