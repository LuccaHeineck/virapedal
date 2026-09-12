import { useCallback, useState } from 'react';
import { Route, startRoute } from './useRoutes';

const GENERIC_CREATE_ERROR = 'Não foi possível iniciar a rota. Tente novamente.';

// Wrapper fino sobre startRoute (mesma relação de useCreateEvent com
// createGroupEvent) -- expõe estado de submissão/erro para a tela de
// "Iniciar rota" e devolve a linha criada para a navegação.
export function useStartRoute() {
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createRoute = useCallback(async (input: { name: string | null; eventId: number | null }): Promise<Route | null> => {
    setSubmitting(true);
    setCreateError(null);

    const created = await startRoute(input);

    setSubmitting(false);
    if (!created) {
      setCreateError(GENERIC_CREATE_ERROR);
      return null;
    }

    return created;
  }, []);

  return { createRoute, submitting, createError };
}
