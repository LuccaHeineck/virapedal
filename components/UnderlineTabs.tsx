import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, neutrals } from '../constants/colors';

type UnderlineTabsProps<K extends string> = {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

// Abas de largura igual com um sublinhado azul na ativa -- o padrão das abas
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutrals.hairline,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: neutrals.mute,
  },
  labelActive: {
    color: neutrals.ink,
    fontWeight: '600',
  },
});
