-- Rota base de um pedal: o traçado "oficial" exibido no pedal depois que ele
-- acontece (mapa, km, subida). Não é uma coluna -- é derivada das rotas
-- finalizadas vinculadas ao pedal, por ordem de preferência:
--
--   1. a rota de quem criou o pedal (o organizador);
--   2. a de um admin do grupo;
--   3. a de qualquer participante.
--
-- Empates em cada nível vão para quem finalizou primeiro. Rotas sem
-- distância (GPS que não pegou) não contam: um traçado vazio não serve de
-- base para ninguém.
--
-- SECURITY DEFINER porque a regra consulta group_members (que o RLS só
-- mostra a membros) para saber quem é admin -- quem vê um pedal de grupo
-- público sem ser membro também precisa ver a rota base. O acesso continua
-- condicionado a can_view_event, a mesma regra do SELECT de routes.

create or replace function public.event_base_route(p_event_id bigint)
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
    select r.id
    from public.routes r
    join public.events e on e.id = r.event_id
    where r.event_id = p_event_id
      and r.status = 'finished'
      and coalesce(r.distance_meters, 0) > 0
      and public.can_view_event(p_event_id, auth.uid())
    order by
      case
        when r.recorded_by = e.created_by then 0
        when public.is_group_admin(e.group_id, r.recorded_by) then 1
        else 2
      end,
      r.finished_at asc nulls last,
      r.id asc
    limit 1;
$$;

revoke all on function public.event_base_route(bigint) from public;
grant execute on function public.event_base_route(bigint) to authenticated;
