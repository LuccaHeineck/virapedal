import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { palette } from '../constants/colors';
import { fonts, radii } from '../constants/theme';

type TextFieldProps = TextInputProps & {
  label?: string;
};

export function TextField({ label, style, multiline, ...inputProps }: TextFieldProps) {
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, multiline && styles.multiline, style]}
        placeholderTextColor={PLACEHOLDER}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...inputProps}
      />
    </View>
  );
}

// ink a ~45%: legível, mas claramente mais fraco que o texto digitado.
const PLACEHOLDER = 'rgba(36,30,26,0.45)';

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: palette.ink,
    opacity: 0.7,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radii.input,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: palette.ink,
    // No web o <textarea> (multiline) recebe outra fonte da UA stylesheet e
    // o <input> ganha contorno azul de foco; os dois destoam do design.
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
  multiline: {
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
  },
});
