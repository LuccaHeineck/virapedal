import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GROUP_COLUMNS, Group, GroupPrivacy } from './useGroups';

const GENERIC_CREATE_ERROR = 'Não foi possível criar o grupo. Tente novamente.';
const GENERIC_SAVE_ERROR = 'Não foi possível salvar as alterações do grupo. Tente novamente.';

export type CreateGroupInput = {
  name: string;
  description: string | null;
  privacy: GroupPrivacy;
  imagePath?: string | null;
};

export type UpdateGroupInput = Partial<{
  name: string;
  description: string | null;
  image_url: string | null;
  privacy: GroupPrivacy;
}>;

export function useGroupMutations() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = useCallback(async (input: CreateGroupInput) => {
    setSubmitting(true);
    setError(null);

    // supabase.rpc() não segue a convenção de encadear .select()/.single()
    // usada nas queries diretas (esse encadeamento é da query builder, que
    // create_group() não passa por) — mas a checagem explícita de `error`
    // continua obrigatória, e create_group() retorna a linha diretamente
    // por ser uma função de retorno único (não SETOF).
    const { data, error: rpcError } = await supabase.rpc('create_group', {
      p_name: input.name,
      p_description: input.description,
      p_image_path: input.imagePath ?? null,
      p_privacy: input.privacy,
    });

    setSubmitting(false);
    if (rpcError || !data) {
      setError(GENERIC_CREATE_ERROR);
      return null;
    }

    return data as Group;
  }, []);

  const updateGroup = useCallback(async (groupId: number, updates: UpdateGroupInput) => {
    setSubmitting(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select(GROUP_COLUMNS)
      .single<Group>();

    setSubmitting(false);
    if (updateError || !data) {
      setError(GENERIC_SAVE_ERROR);
      return null;
    }

    return data;
  }, []);

  return { createGroup, updateGroup, submitting, error };
}
