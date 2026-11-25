import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthDivider } from '../../components/AuthDivider';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { palette } from '../../constants/colors';
import { fonts } from '../../constants/theme';

// Mesmo tom de placeholder do TextField: ink a ~45%.
const PLACEHOLDER = 'rgba(36,30,26,0.45)';
import { getAuthErrorMessage, getOAuthRedirectErrorMessage } from '../../lib/authErrors';
import { signInWithGoogle } from '../../lib/googleAuth';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleLogin() {
    if (!canSubmit || submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(getAuthErrorMessage(signInError));
      setSubmitting(false);
      return;
    }

    // Em caso de sucesso, o listener onAuthStateChange do AuthContext recebe SIGNED_IN
    // e o roteamento do layout raiz redireciona para o grupo autenticado.
    setSubmitting(false);
  }

  async function handleGoogleSignIn() {
    if (submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: googleError, cancelled, redirectFailed } = await signInWithGoogle();

    if (cancelled) {
      setSubmitting(false);
      return;
    }
    if (redirectFailed) {
      setError(getOAuthRedirectErrorMessage());
      setSubmitting(false);
      return;
    }
    if (googleError) {
      setError(getAuthErrorMessage(googleError));
      setSubmitting(false);
      return;
    }

    // Em caso de sucesso, o listener onAuthStateChange do AuthContext recebe SIGNED_IN
    // e o roteamento do layout raiz redireciona para o grupo autenticado.
    setSubmitting(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar</Text>

      <GoogleSignInButton busy={submitting} onPress={handleGoogleSignIn} />
      <AuthDivider />

      <TextInput
        placeholderTextColor={PLACEHOLDER}
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!submitting}
      />
      <TextInput
        placeholderTextColor={PLACEHOLDER}
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!submitting}
      />

      <Link href="/forgot-password" style={styles.forgotLink}>
        Esqueceu sua senha?
      </Link>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={!canSubmit || submitting}>
        {submitting ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.buttonText}>Entrar</Text>}
      </TouchableOpacity>

      <Link href="/signup" style={styles.link}>
        Não tem uma conta? Cadastre-se
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 44,
    gap: 16,
    backgroundColor: palette.bg,
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 21,
    color: palette.ink,
  },
  input: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: palette.surface,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: palette.ink,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.error,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: palette.onPrimary,
  },
  link: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.primary,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.primary,
  },
});
