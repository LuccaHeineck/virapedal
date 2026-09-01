import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EVENT_COLUMNS, EventStatus } from './useGroupEvents';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type EventDetail = {
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
  group_name: string;
  creator_name: string;
};

const EVENT_DETAIL_COLUMNS = `${EVENT_COLUMNS}, groups(name), users:created_by(name)`;

const GENERIC_LOAD_ERROR = 'Não foi possível carregar o pedal. Tente novamente.';
const GENERIC_SAVE_ERROR = 'Não foi possível salvar as alterações do pedal. Tente novamente.';

export type UpdateEventInput = Partial<{
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  meetingPoint: string | null;
  routeDescription: string | null;
  status: EventStatus;
}>;

export function useEvent(eventId: number) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Ausência aqui é ambígua entre "pedal não existe" e "sem acesso ao grupo"
  // (mesmo caso do useGroup) -- o RLS de events filtra silenciosamente.
  const fetchEvent = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('events')
      .select(EVENT_DETAIL_COLUMNS)
      .eq('id', eventId)
      .maybeSingle<
        Omit<EventDetail, 'group_name' | 'creator_name'> & {
          groups: { name: string } | null;
          users: { name: string } | null;
        }
      >();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { groups, users, ...rest } = data;
    setEvent({ ...rest, group_name: groups?.name ?? '', creator_name: users?.name ?? 'Usuário' });
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const updateEvent = useCallback(
    async (input: UpdateEventInput) => {
      setSubmitting(true);
      setSaveError(null);

      const { data, error: updateError } = await supabase
        .from('events')
        .update({
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.eventDate !== undefined && { event_date: input.eventDate }),
          ...(input.startTime !== undefined && { start_time: input.startTime }),
          ...(input.meetingPoint !== undefined && { meeting_point: input.meetingPoint }),
          ...(input.routeDescription !== undefined && { route_description: input.routeDescription }),
          ...(input.status !== undefined && { status: input.status }),
        })
        .eq('id', eventId)
        .select('id')
        .single();

      setSubmitting(false);
      if (updateError || !data) {
        setSaveError(GENERIC_SAVE_ERROR);
        return false;
      }

      await fetchEvent();
      return true;
    },
    [eventId, fetchEvent]
  );

  return { event, loading, error, refresh: fetchEvent, updateEvent, submitting, saveError };
}
