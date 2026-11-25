import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, neutrals } from '../constants/colors';
import { fonts } from '../constants/theme';

type UnderlineTabsProps<K extends string> = {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

// Abas de largura igual com um sublinhado terracota na ativa -- o padrão das abas
// de conteúdo do app (Perfil, Grupos), para que alternar listas tenha a
// mesma cara em toda parte.
export function UnderlineTabs<K extends string>({ tabs, active, onChange, style }: UnderlineTabsProps<K>) {
  return (
    <View style={[styles.tabs, style]} accessibilityRole="tablist">
      {tabs.map(({ key, label }) => {
        const selected = active === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, selected && styles.tabActive]}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}>
            <Text style={[styles.label, selected && styles.labelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: neutrals.hairline,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: neutrals.mute,
  },
  labelActive: {
    color: neutrals.ink,
  },
});
