import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EventStatus } from './useGroupEvents';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type UpcomingEvent = {
  id: number;
  group_id: number;
  group_name: string;
  title: string;
  event_date: string; // 'AAAA-MM-DD'
  start_time: string; // 'HH:MM:SS'
  meeting_point: string | null;
  status: EventStatus;
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
      .select('id, group_id, title, event_date, start_time, meeting_point, status, groups(name)')
      .in('group_id', groupIds)
      .gte('event_date', todayDateString())
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .returns<Array<Omit<UpcomingEvent, 'group_name'> & { groups: { name: string } | null }>>();

    if (eventsError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setEvents(data.map(({ groups, ...event }) => ({ ...event, group_name: groups?.name ?? '' })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);

  return { events, loading, error, refresh: fetchUpcomingEvents };
}
