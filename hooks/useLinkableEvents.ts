import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type LinkableEvent = {
  id: number;
  title: string;
  event_date: string; // 'AAAA-MM-DD'
  start_time: string; // 'HH:MM:SS'
  group_name: string;
};

// Uma janela de alguns dias em torno da rota, não o dia exato: grupos não
// marcam pedal todo dia, então casar a data exatamente fazia a seção quase
// nunca aparecer. Três dias para cada lado cobre o pedal que você registrou
// no dia seguinte e o que saiu antes do combinado, sem virar uma lista de
// tudo que o grupo já marcou.
const WINDOW_DAYS = 3;

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Pedais dos grupos do usuário perto da data da rota -- os candidatos
// plausíveis para "foi nesse pedal?". Busca para trás também (e não só os
// futuros, como useUpcomingEvents) porque isto é perguntado depois de
// pedalar, quando o evento já aconteceu.
export function useLinkableEvents(dateIso: string | null) {
  const [events, setEvents] = useState<LinkableEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!dateIso) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userData.user.id)
      .is('left_at', null);

    const groupIds = memberships?.map((row) => row.group_id) ?? [];
    if (groupIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const from = new Date(dateIso);
    from.setDate(from.getDate() - WINDOW_DAYS);
    const to = new Date(dateIso);
    to.setDate(to.getDate() + WINDOW_DAYS);

    const { data } = await supabase
      .from('events')
      .select('id, title, event_date, start_time, groups(name)')
      .in('group_id', groupIds)
      .gte('event_date', toDateKey(from))
      .lte('event_date', toDateKey(to))
      .neq('status', 'cancelled')
      .order('event_date', { ascending: false })
      .order('start_time', { ascending: true })
      .returns<Array<Omit<LinkableEvent, 'group_name'> & { groups: { name: string } | null }>>();

    // Uma falha aqui significa apenas "nenhum pedal para oferecer": a seção
    // some da tela e nada mais depende dela, então não há erro a exibir.
    setEvents((data ?? []).map(({ groups, ...event }) => ({ ...event, group_name: groups?.name ?? '' })));
    setLoading(false);
  }, [dateIso]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refresh: fetchEvents };
}
