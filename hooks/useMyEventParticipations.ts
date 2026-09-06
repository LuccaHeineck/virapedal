import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EventStatus } from './useGroupEvents';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type MyEventParticipation = {
  id: number;
  group_id: number;
  group_name: string;
  // Caminho no bucket privado group-images, não uma URL navegável -- use
  // GroupImage/useSignedImageUrl pra renderizar.
  group_image_url: string | null;
  title: string;
  event_date: string; // 'AAAA-MM-DD'
  start_time: string; // 'HH:MM:SS'
  meeting_point: string | null;
  status: EventStatus;
};

const GENERIC_LOAD_ERROR = 'Não foi possível carregar seus pedais. Tente novamente.';

export function useMyEventParticipations() {
  const [events, setEvents] = useState<MyEventParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Passados e futuros, em ordem cronológica (crescente) -- diferente de
  // useUpcomingEvents, que só mostra o que ainda vai acontecer.
  const fetchParticipations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { data: participations, error: participationsError } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', userData.user.id)
      .neq('status', 'cancelled');

    if (participationsError || !participations) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const eventIds = participations.map((row) => row.event_id);
    if (eventIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data, error: eventsError } = await supabase
      .from('events')
      .select('id, group_id, title, event_date, start_time, meeting_point, status, groups(name, image_url)')
      .in('id', eventIds)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .returns<
        Array<
          Omit<MyEventParticipation, 'group_name' | 'group_image_url'> & {
            groups: { name: string; image_url: string | null } | null;
          }
        >
      >();

    if (eventsError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setEvents(
      data.map(({ groups, ...event }) => ({
        ...event,
        group_name: groups?.name ?? '',
        group_image_url: groups?.image_url ?? null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchParticipations();
  }, [fetchParticipations]);

  return { events, loading, error, refresh: fetchParticipations };
}
