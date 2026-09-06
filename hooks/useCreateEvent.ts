import { useCallback, useState } from 'react';
import { CreateEventInput, createGroupEvent } from './useGroupEvents';

const GENERIC_CREATE_ERROR = 'Não foi possível criar o pedal. Tente novamente.';

// Mesma lógica de criação de useGroupEvents, mas sem um groupId fixo -- para
// telas onde o grupo é escolhido num seletor (ex: criar pedal a partir da
// Home) em vez de vir implícito da rota `/groups/[id]/events/new`.
export function useCreateEvent() {
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createEvent = useCallback(async (groupId: number, input: CreateEventInput) => {
    setSubmitting(true);
    setCreateError(null);

    const created = await createGroupEvent(groupId, input);

    setSubmitting(false);
    if (!created) {
      setCreateError(GENERIC_CREATE_ERROR);
      return false;
    }

    return true;
  }, []);

  return { createEvent, submitting, createError };
}
