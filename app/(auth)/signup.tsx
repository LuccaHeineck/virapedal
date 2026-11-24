import { useState } from 'react';
import { AuthDivider } from '../../components/AuthDivider';
import { AuthShell } from '../../components/AuthShell';
import { Button } from '../../components/Button';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { StatusText } from '../../components/StatusText';
import { TextField } from '../../components/TextField';
import { getAuthErrorMessage, getOAuthRedirectErrorMessage } from '../../lib/authErrors';
import { signInWithGoogle } from '../../lib/googleAuth';
import { supabase } from '../../lib/supabase';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && EMAIL_SHAPE.test(email.trim()) && password.length > 0;

  async function handleSignup() {
    if (!canSubmit || submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (signUpError) {
      setError(getAuthErrorMessage(signUpError));
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
    <AuthShell mode="signup">
      <GoogleSignInButton busy={submitting} onPress={handleGoogleSignIn} />
      <AuthDivider />

      <TextField
        label="Nome completo"
        placeholder="Camila Duarte"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!submitting}
      />
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

      {error ? <StatusText variant="error">{error}</StatusText> : null}

      <Button title="Criar conta" onPress={handleSignup} disabled={!canSubmit} loading={submitting} />
    </AuthShell>
  );
}
