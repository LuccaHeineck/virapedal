import { Session, User } from '@supabase/supabase-js';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  // true enquanto a tela "Esqueceu sua senha?" confirma o código e define a
  // nova senha: verifyOtp já cria uma sessão, e sem isto o layout raiz
  // trocaria para o grupo autenticado antes de a senha nova ser salva.
  passwordRecovery: boolean;
  setPasswordRecovery: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isAuthRejection(error: { status?: number } | null): boolean {
  return error?.status === 401 || error?.status === 403;
}

// getSession() só lê o armazenamento local e confia no horário do aparelho
// para saber se o token venceu. Se o servidor discorda (relógio atrasado, aba
// que voltou de suspensão), todas as telas disparam getUser() com o token
// vencido, recebem 403 e mostram erro -- e a renovação automática que vem
// logo depois não as faz tentar de novo. Por isso a sessão é validada uma vez
// aqui, antes de qualquer tela montar, e renovada se o servidor recusar.
async function loadValidSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return null;
  }

  const { error: userError } = await supabase.auth.getUser();
  // Sem rede (ou outro erro que não seja recusa do servidor) a sessão local
  // é mantida: deslogar alguém só por estar offline seria pior.
  if (!isAuthRejection(userError)) {
    return data.session;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshed.session) {
    return refreshed.session;
  }

  // O servidor recusou também a renovação (sessão encerrada em outro lugar):
  // apaga o login morto daqui e o layout raiz leva para a tela de entrada.
  if (refreshError && refreshError.status !== undefined && refreshError.status >= 400 && refreshError.status < 500) {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }

  return data.session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // Leitura best-effort na inicialização: uma falha ao buscar a sessão local
    // significa apenas "tratar como não autenticado", então o erro não é exibido ao usuário aqui.
    loadValidSession().then((initialSession) => {
      setSession(initialSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, passwordRecovery, setPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
