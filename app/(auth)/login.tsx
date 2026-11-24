import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { AuthDivider } from '../../components/AuthDivider';
import { AuthShell } from '../../components/AuthShell';
import { Button } from '../../components/Button';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { StatusText } from '../../components/StatusText';
import { TextField } from '../../components/TextField';
import { palette } from '../../constants/colors';
import { fonts } from '../../constants/theme';
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
    <AuthShell mode="login">
      <GoogleSignInButton busy={submitting} onPress={handleGoogleSignIn} />
      <AuthDivider />

      <TextField
        label="E-mail"
        placeholder="voce@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!submitting}
      />
      <TextField
        label="Senha"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!submitting}
      />

      <Link href="/forgot-password" style={styles.forgotLink}>
        Esqueceu sua senha?
      </Link>

      {error ? <StatusText variant="error">{error}</StatusText> : null}

      <Button title="Entrar" onPress={handleLogin} disabled={!canSubmit} loading={submitting} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -6,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.primary,
  },
});
