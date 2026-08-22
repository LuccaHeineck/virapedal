import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type UserProfile = {
  id: string;
  name: string;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
};

const PROFILE_COLUMNS = 'id, name, profile_photo_url, created_at, updated_at';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar seu perfil. Tente novamente.';
const GENERIC_SAVE_ERROR = 'Não foi possível salvar suas alterações. Tente novamente.';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    // O RLS restringe isto à própria linha do chamador; uma linha ausente/negada
    // é indistinguível aqui, então as falhas recebem a mesma mensagem genérica
    // em vez de uma distinção artificial entre "não encontrado" e "não permitido".
    const { data, error: selectError } = await supabase
      .from('users')
      .select(PROFILE_COLUMNS)
      .eq('id', userData.user.id)
      .single<UserProfile>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const save = useCallback(async (updates: { name: string }) => {
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_SAVE_ERROR);
      return false;
    }

    // .select().single() é necessário aqui: sem isso, `data` seria null mesmo
    // em caso de sucesso, então não haveria como confirmar que a gravação foi aplicada.
    const { data, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userData.user.id)
      .select(PROFILE_COLUMNS)
      .single<UserProfile>();

    if (updateError || !data) {
      setError(GENERIC_SAVE_ERROR);
      return false;
    }

    setProfile(data);
    return true;
  }, []);

  return { profile, loading, error, refresh: fetchProfile, save };
}
