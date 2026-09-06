import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EventStatus } from './useGroupEvents';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type UpcomingEvent = {
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
  is_participant: boolean;
};

const GENERIC_LOAD_ERROR = 'Não foi possível carregar os pedais. Tente novamente.';

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useUpcomingEvents() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userData.user.id)
      .is('left_at', null);

    if (membershipsError || !memberships) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((row) => row.group_id);
    if (groupIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data, error: eventsError } = await supabase
      .from('events')
      .select('id, group_id, title, event_date, start_time, meeting_point, status, groups(name, image_url)')
      .in('group_id', groupIds)
      .gte('event_date', todayDateString())
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .returns<
        Array<
          Omit<UpcomingEvent, 'group_name' | 'group_image_url' | 'is_participant'> & {
            groups: { name: string; image_url: string | null } | null;
          }
        >
      >();

    if (eventsError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    // Segunda query só com os ids já carregados -- mesma razão de
    // useGroupEvents: event_participants tem duas FKs pra users, então
    // embed direto exige desambiguar, e aqui nem precisamos de nome/foto,
    // só saber quais ids já tem participação ativa.
    let participatingIds = new Set<number>();
    if (data.length > 0) {
      const { data: participations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', userData.user.id)
        .neq('status', 'cancelled')
        .in(
          'event_id',
          data.map((event) => event.id)
        );
      participatingIds = new Set(participations?.map((row) => row.event_id) ?? []);
    }

    setEvents(
      data.map(({ groups, ...event }) => ({
        ...event,
        group_name: groups?.name ?? '',
        group_image_url: groups?.image_url ?? null,
        is_participant: participatingIds.has(event.id),
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);

  return { events, loading, error, refresh: fetchUpcomingEvents };
}
