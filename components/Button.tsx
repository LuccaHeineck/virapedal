import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { palette } from '../constants/colors';
import { fonts, radii } from '../constants/theme';

// outline: botão secundário (ex.: "Sair"), transparente com borda.
type ButtonVariant = 'primary' | 'outline' | 'destructive' | 'plain';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, disabled, loading, variant = 'primary', style }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.base, variantStyles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? palette.onPrimary : textColors[variant]} />
      ) : (
        <Text style={[styles.text, { color: textColors[variant] }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const textColors: Record<ButtonVariant, string> = {
  primary: palette.onPrimary,
  outline: palette.ink,
  destructive: palette.error,
  plain: palette.primary,
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.button,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Desabilitado mantém a cor e só perde opacidade.
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: fonts.display,
    fontSize: 15,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: palette.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  destructive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.errorTint,
  },
  plain: {
    backgroundColor: 'transparent',
  },
});
