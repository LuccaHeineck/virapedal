import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type EventStatus = 'scheduled' | 'cancelled' | 'completed';

export type GroupEvent = {
  id: number;
  group_id: number;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string; // 'AAAA-MM-DD'
  start_time: string; // 'HH:MM:SS'
  meeting_point: string | null;
  route_description: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
};

const EVENT_COLUMNS =
  'id, group_id, created_by, title, description, event_date, start_time, meeting_point, route_description, status, created_at, updated_at';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar os pedais. Tente novamente.';
const GENERIC_CREATE_ERROR = 'Não foi possível criar o pedal. Tente novamente.';

export type CreateEventInput = {
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  meetingPoint: string | null;
  routeDescription: string | null;
};

export function useGroupEvents(groupId: number) {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Visível a quem pode ver o grupo (o mesmo RLS de groups: grupos públicos
  // são visíveis a qualquer autenticado, privados só a membros ativos) — uma
  // lista vazia pode significar tanto "sem pedais agendados" quanto "sem
  // acesso ao grupo", indistinguivelmente.
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('group_id', groupId)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .returns<GroupEvent[]>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setEvents(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Permitido pelo RLS para qualquer membro ativo do grupo (is_group_member),
  // não apenas admins.
  const createEvent = useCallback(
    async (input: CreateEventInput) => {
      setSubmitting(true);
      setCreateError(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setCreateError(GENERIC_CREATE_ERROR);
        setSubmitting(false);
        return false;
      }

      const { data, error: insertError } = await supabase
        .from('events')
        .insert({
          group_id: groupId,
          created_by: userData.user.id,
          title: input.title,
          description: input.description,
          event_date: input.eventDate,
          start_time: input.startTime,
          meeting_point: input.meetingPoint,
          route_description: input.routeDescription,
        })
        .select('id')
        .single();

      setSubmitting(false);
      if (insertError || !data) {
        setCreateError(GENERIC_CREATE_ERROR);
        return false;
      }

      await fetchEvents();
      return true;
    },
    [groupId, fetchEvents]
  );

  return { events, loading, error, refresh: fetchEvents, createEvent, submitting, createError };
}
