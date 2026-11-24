import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { palette } from '../constants/colors';
import { fonts, radii } from '../constants/theme';

type SegmentedControlProps<K extends string> = {
  options: { key: K; label: string }[];
  active: K | null;
  onChange: (key: K) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Controle segmentado do design (Entrar/Cadastrar, Meus grupos/Descobrir,
// Público/Privado, RSVP): trilho bege com a opção ativa em terracota.
export function SegmentedControl<K extends string>({ options, active, onChange, disabled, style }: SegmentedControlProps<K>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map(({ key, label }) => {
        const selected = active === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.option, selected && styles.optionActive]}
            onPress={() => onChange(key)}
            disabled={disabled}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}>
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radii.button,
    backgroundColor: palette.segmentTrack,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.input,
  },
  optionActive: {
    backgroundColor: palette.primary,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: palette.segmentInk,
  },
  labelActive: {
    color: palette.onPrimary,
  },
});
