-- Grupos privados visíveis em "Descobrir".
--
-- O SELECT em groups só mostra grupos públicos e os grupos de que o usuário
-- já é membro, então um grupo privado era invisível para quem estava de
-- fora -- e o fluxo de "Solicitar entrada" nunca era alcançável. Agora o
-- admin de um grupo privado escolhe se ele aparece em "Descobrir"
-- (discoverable). Mesmo visível, quem não é membro só vê o nome do grupo e
-- quem o administra: descrição, foto, membros e pedais continuam restritos.
--
-- Como o RLS não restringe colunas, essa vitrine limitada sai por uma função
-- (discoverable_private_groups) em vez de afrouxar a policy de groups.

alter table public.groups
    add column if not exists discoverable boolean not null default false;

comment on column public.groups.discoverable is
    'Só vale para grupos privados: true = aparece em Descobrir e aceita solicitações de entrada.';

-- --- Vitrine de grupos privados visíveis ---

create or replace function public.discoverable_private_groups()
returns table (
    id bigint,
    name text,
    created_at timestamptz,
    admin_names text[],
    has_pending_request boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select
        g.id,
        g.name::text,
        g.created_at,
        coalesce(
            array(
                select u.name::text
                from public.group_members gm
                join public.users u on u.id = gm.user_id
                where gm.group_id = g.id
                  and gm.role = 'admin'
                  and gm.left_at is null
                order by gm.joined_at
            ),
            '{}'
        ) as admin_names,
        exists (
            select 1
            from public.group_join_requests r
            where r.group_id = g.id
              and r.requested_by = auth.uid()
              and r.status = 'pending'
        ) as has_pending_request
    from public.groups g
    where g.privacy = 'private'
      and g.discoverable
      and not public.is_group_member(g.id, auth.uid())
    order by g.created_at desc;
$$;

revoke execute on function public.discoverable_private_groups() from public;
grant execute on function public.discoverable_private_groups() to authenticated;

-- --- Solicitações só para grupos privados visíveis ---

-- Antes qualquer usuário podia criar uma solicitação para qualquer grupo.
-- Agora só para grupos privados marcados como visíveis, e só por quem ainda
-- não é membro. Deixar o grupo invisível corta novas solicitações; as que já
-- estavam pendentes continuam na tela de Solicitações para o admin decidir.
--
-- A checagem do grupo fica numa função SECURITY DEFINER: dentro da policy,
-- um select direto em groups passaria pelo RLS de groups, e quem pede ainda
-- não é membro -- então não enxergaria o grupo privado e a checagem sempre
-- falharia.
create or replace function public.group_accepts_join_requests(p_group_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.privacy = 'private'
          and g.discoverable
    );
$$;

drop policy if exists "Request to join a group" on public.group_join_requests;
create policy "Request to join a group"
    on public.group_join_requests for insert to authenticated
    with check (
        requested_by = auth.uid()
        and not public.is_group_member(group_id, auth.uid())
        and public.group_accepts_join_requests(group_id)
    );
