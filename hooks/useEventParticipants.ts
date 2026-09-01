import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type ParticipantStatus = 'confirmed' | 'maybe' | 'cancelled';

export type EventParticipant = {
  id: number;
  event_id: number;
  user_id: string | null;
  guest_name: string | null;
  status: ParticipantStatus;
  users: { name: string; profile_photo_url: string | null } | null;
};

// event_participants tem duas FKs para users (user_id e added_by) -- sem
// desambiguar, o PostgREST recusa o embed com "more than one relationship
// was found" (PGRST201).
const PARTICIPANT_COLUMNS =
  'id, event_id, user_id, guest_name, status, users!event_participants_user_id_fkey(name, profile_photo_url)';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar os participantes. Tente novamente.';
const GENERIC_JOIN_ERROR = 'Não foi possível confirmar sua presença. Tente novamente.';
const GENERIC_LEAVE_ERROR = 'Não foi possível sair do pedal. Tente novamente.';

export function useEventParticipants(eventId: number) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('event_participants')
      .select(PARTICIPANT_COLUMNS)
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .order('id', { ascending: true })
      .returns<EventParticipant[]>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setParticipants(data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // A unique index em (event_id, user_id) não é parcial (diferente do
  // left_at de group_members), então reentrar depois de ter saído precisa de
  // um UPDATE na própria linha cancelada, não de um novo INSERT.
  const join = useCallback(async () => {
    setSubmitting(true);
    setActionError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setSubmitting(false);
      setActionError(GENERIC_JOIN_ERROR);
      return false;
    }
    const uid = userData.user.id;

    const { data: existing } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', uid)
      .maybeSingle();

    const { data, error: mutationError } = existing
      ? await supabase
          .from('event_participants')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('id')
          .single()
      : await supabase
          .from('event_participants')
          .insert({ event_id: eventId, user_id: uid, status: 'confirmed', confirmed_at: new Date().toISOString() })
          .select('id')
          .single();

    setSubmitting(false);
    if (mutationError || !data) {
      setActionError(GENERIC_JOIN_ERROR);
      return false;
    }

    await fetchParticipants();
    return true;
  }, [eventId, fetchParticipants]);

  const leave = useCallback(async () => {
    setSubmitting(true);
    setActionError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setSubmitting(false);
      setActionError(GENERIC_LEAVE_ERROR);
      return false;
    }

    const { data, error: updateError } = await supabase
      .from('event_participants')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('user_id', userData.user.id)
      .select('id')
      .single();

    setSubmitting(false);
    if (updateError || !data) {
      setActionError(GENERIC_LEAVE_ERROR);
      return false;
    }

    await fetchParticipants();
    return true;
  }, [eventId, fetchParticipants]);

  return { participants, loading, error, refresh: fetchParticipants, join, leave, submitting, actionError };
}
