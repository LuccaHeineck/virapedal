import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getAuthErrorMessage } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';
import { palette } from '../../constants/colors';
import { fonts } from '../../constants/theme';

const MIN_PASSWORD_LENGTH = 6;

// Recuperação de senha por código (OTP) enviado por e-mail, em vez de link:
// não depende de deep link e funciona mesmo se o e-mail for aberto em outro
// aparelho. O template "Reset Password" do Supabase precisa incluir {{ .Token }}.
export default function ForgotPassword() {
  const router = useRouter();
  const { setPasswordRecovery } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // true entre o verifyOtp (que já cria uma sessão) e a senha nova ser salva.
  // Se a tela sair nesse meio-tempo, a sessão de recuperação é descartada para
  // o usuário não acabar logado sem ter definido a senha.
  const recoveringRef = useRef(false);

  useEffect(() => {
    return () => {
      if (recoveringRef.current) {
        recoveringRef.current = false;
        // Best-effort: se falhar, a sessão continua válida e o usuário só
        // entra no app logado, sem nada de errado para mostrar aqui.
        supabase.auth.signOut().finally(() => setPasswordRecovery(false));
      }
    };
  }, [setPasswordRecovery]);

  const trimmedEmail = email.trim();
  const trimmedCode = code.trim();
  const canSendCode = trimmedEmail.length > 0;
  const canReset = trimmedCode.length >= 6 && password.length > 0 && confirmPassword.length > 0;

  async function handleSendCode() {
    if (!canSendCode || submitting) {
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

    setSubmitting(false);
    if (resetError) {
      setError(getAuthErrorMessage(resetError));
      return;
    }

    // Mensagem neutra de propósito: não revela se existe uma conta com o e-mail.
    setInfo('Se houver uma conta com este e-mail, enviamos um código para redefinir sua senha.');
    setStep('code');
  }

  async function handleReset() {
    if (!canReset || submitting) {
      return;
    }
    setError(null);
    setInfo(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);

    // Uma nova tentativa após falha no updateUser já tem a sessão de
    // recuperação; não precisa (nem pode, o código já foi usado) verificar de novo.
    if (!recoveringRef.current) {
      setPasswordRecovery(true);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: 'recovery',
      });

      if (verifyError) {
        setPasswordRecovery(false);
        setError(getAuthErrorMessage(verifyError));
        setSubmitting(false);
        return;
      }
      recoveringRef.current = true;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(getAuthErrorMessage(updateError));
      setSubmitting(false);
      return;
    }

    // A sessão criada pelo verifyOtp continua ativa: liberar o flag faz o
    // layout raiz redirecionar para o grupo autenticado, já logado.
    recoveringRef.current = false;
    setPasswordRecovery(false);
  }

  async function handleBack() {
    if (recoveringRef.current) {
      recoveringRef.current = false;
      // Best-effort, mesmo motivo do cleanup acima.
      await supabase.auth.signOut();
      setPasswordRecovery(false);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redefinir senha</Text>

      {step === 'email' ? (
        <>
          <Text style={styles.description}>Informe o e-mail da sua conta e enviaremos um código para criar uma nova senha.</Text>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!submitting}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (!canSendCode || submitting) && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={!canSendCode || submitting}>
            {submitting ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.buttonText}>Enviar código</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          {info ? <Text style={styles.description}>{info}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Código"
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={8}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            editable={!submitting && !recoveringRef.current}
          />
          <TextInput
            style={styles.input}
            placeholder="Nova senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!submitting}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!submitting}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (!canReset || submitting) && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={!canReset || submitting}>
            {submitting ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.buttonText}>Redefinir senha</Text>}
          </TouchableOpacity>

          {!recoveringRef.current ? (
            <TouchableOpacity onPress={handleSendCode} disabled={submitting}>
              <Text style={styles.link}>Reenviar código</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      <TouchableOpacity onPress={handleBack} disabled={submitting}>
        <Text style={styles.link}>Voltar para o login</Text>
      </TouchableOpacity>
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
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
    opacity: 0.72,
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
});
