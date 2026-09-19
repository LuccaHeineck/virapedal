import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

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
        <ActivityIndicator color="#2f6feb" />
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
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f1f1f',
  },
});
