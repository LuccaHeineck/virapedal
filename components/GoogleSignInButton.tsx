import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';

type Props = {
  busy: boolean;
  onPress: () => void;
};

export function GoogleSignInButton({ busy, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, busy && styles.buttonDisabled]}
      onPress={onPress}
      disabled={busy}>
      {busy ? (
        <ActivityIndicator color={palette.primary} />
      ) : (
        <>
          <Text style={styles.icon}>G</Text>
          <Text style={styles.text}>Continuar com Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: '#4285F4',
  },
  text: {
    fontSize: 15,
    fontFamily: fonts.display,
    color: palette.ink,
  },
});
