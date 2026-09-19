import { AuthError } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export type GoogleSignInResult = {
  // Erro de autenticação do Supabase (provider desabilitado, code expirado etc.);
  // use getAuthErrorMessage() para converter em mensagem exibível.
  error: AuthError | null;
  // true quando o usuário fechou a aba do navegador sem concluir - não é um erro.
  cancelled: boolean;
  // true quando a URL de retorno não trouxe um `code` utilizável (consentimento
  // negado, redirect URL fora da allow-list etc.); use getOAuthRedirectErrorMessage().
  redirectFailed: boolean;
};

// Login/cadastro com Google via navegador (Supabase OAuth + PKCE), conforme
// docs/superpowers/specs/2026-09-16-google-auth-design.md.
//
// Usa a rota `login` (que já existe) como redirectTo para não precisar de uma
// rota de callback dedicada: se o deep link chegar com o app morto, o
// expo-router simplesmente abre a tela Entrar e o usuário toca de novo.
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = makeRedirectUri({ path: 'login' });

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) {
      return { error, cancelled: false, redirectFailed: false };
    }

    if (!data?.url) {
      return { error: null, cancelled: false, redirectFailed: true };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success') {
      // cancel/dismiss (usuário fechou a aba) ou locked (raro, Android) - em
      // nenhum desses casos há algo de errado para mostrar ao usuário.
      return { error: null, cancelled: true, redirectFailed: false };
    }

    const { queryParams } = Linking.parse(result.url);

    if (queryParams?.error === 'access_denied') {
      // Usuário negou o consentimento na própria tela do Google - equivalente
      // a fechar a aba, não é um erro para mostrar.
      return { error: null, cancelled: true, redirectFailed: false };
    }

    const code = typeof queryParams?.code === 'string' ? queryParams.code : undefined;

    if (!code) {
      return { error: null, cancelled: false, redirectFailed: true };
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    return { error: exchangeError, cancelled: false, redirectFailed: false };
  } catch {
    // Falha inesperada (ex.: iOS recusando abrir uma segunda sessão de auth
    // simultânea). Trata como falha de redirect para reaproveitar a mensagem
    // de getOAuthRedirectErrorMessage() e garantir que a promise sempre
    // resolve - nunca rejeita - liberando o `submitting` das telas chamadoras.
    return { error: null, cancelled: false, redirectFailed: true };
  }
}
