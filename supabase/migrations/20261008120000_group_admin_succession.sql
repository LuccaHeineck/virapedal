-- Garante que um grupo com membros ativos nunca fique sem administrador.
--
-- Antes disto, o único admin podia se rebaixar ou sair do grupo e o grupo
-- ficava sem ninguém capaz de gerenciá-lo (foi o que aconteceu com
-- "Os Pneu Queimado"). Duas regras:
--
-- 1. Rebaixar (admin -> member) o último admin ativo é recusado. O app já
--    esconde o botão nesse caso; isto cobre chamadas diretas à API.
-- 2. Quando o último admin ativo sai (left_at preenchido) ou sua linha é
--    apagada, o membro ativo mais antigo (menor joined_at) vira admin.
--    Sair não é bloqueado: a pessoa sempre pode deixar o grupo. O app deixa
--    o admin escolher outro sucessor antes de sair; esta regra é a rede de
--    segurança para quando ninguém foi escolhido.
--
-- Além disso, limpa o estado atual: apaga grupos sem nenhum participante e
-- dá um admin aos grupos que têm membros mas nenhum admin.

-- --- 1. Bloqueia o rebaixamento do último admin ---

create or replace function public.prevent_last_admin_demotion()
returns trigger as $$
begin
    if old.role = 'admin'
       and new.role <> 'admin'
       and old.left_at is null
       and new.left_at is null
       and not exists (
           select 1
           from public.group_members gm
           where gm.group_id = old.group_id
             and gm.id <> old.id
             and gm.role = 'admin'
             and gm.left_at is null
       )
    then
        raise exception 'O grupo precisa de pelo menos um administrador.'
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_group_members_prevent_last_admin_demotion on public.group_members;
create trigger trg_group_members_prevent_last_admin_demotion
    before update of role on public.group_members
    for each row execute function public.prevent_last_admin_demotion();

-- --- 2. Sucessão automática quando o último admin sai ---

-- SECURITY DEFINER: quem sai normalmente não é admin depois de sair, e o RLS
-- de UPDATE em group_members só permite alterar a própria linha ou, sendo
-- admin, as dos outros -- sem isto a promoção seria recusada.
create or replace function public.promote_oldest_member_if_no_admin(p_group_id bigint)
returns void as $$
begin
    -- Grupo sendo apagado (ON DELETE CASCADE): nada a promover.
    if not exists (select 1 from public.groups g where g.id = p_group_id) then
        return;
    end if;

    if exists (
        select 1
        from public.group_members gm
        where gm.group_id = p_group_id
          and gm.role = 'admin'
          and gm.left_at is null
    ) then
        return;
    end if;

    update public.group_members
    set role = 'admin'
    where id = (
        select gm.id
        from public.group_members gm
        where gm.group_id = p_group_id
          and gm.left_at is null
        order by gm.joined_at asc, gm.id asc
        limit 1
    );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create or replace function public.handle_admin_departure()
returns trigger as $$
begin
    if tg_op = 'DELETE' then
        if old.role = 'admin' and old.left_at is null then
            perform public.promote_oldest_member_if_no_admin(old.group_id);
        end if;
        return old;
    end if;

    -- UPDATE: um admin ativo acabou de sair do grupo.
    if old.role = 'admin' and old.left_at is null and new.left_at is not null then
        perform public.promote_oldest_member_if_no_admin(new.group_id);
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_group_members_admin_departure on public.group_members;
create trigger trg_group_members_admin_departure
    after update of left_at or delete on public.group_members
    for each row execute function public.handle_admin_departure();

-- Alguém entrando num grupo público que ficou sem admin (ex.: todos saíram)
-- também precisa de um admin -- o membro mais antigo, que pode ser quem
-- acabou de entrar.
create or replace function public.handle_member_join()
returns trigger as $$
begin
    if new.left_at is null then
        perform public.promote_oldest_member_if_no_admin(new.group_id);
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_group_members_member_join on public.group_members;
create trigger trg_group_members_member_join
    after insert on public.group_members
    for each row execute function public.handle_member_join();

-- --- 3. Remove os grupos sem nenhum participante ---

-- Sem membros ativos não há quem promover nem quem use o grupo. ATENÇÃO:
-- irreversível. O ON DELETE CASCADE leva junto pedais, participações e
-- solicitações de entrada; rotas gravadas são mantidas (event_id vira null).
-- A imagem de capa no bucket group-images não é apagada por SQL e fica órfã.
delete from public.groups g
where not exists (
    select 1 from public.group_members gm
    where gm.group_id = g.id and gm.left_at is null
);

-- --- 4. Corrige os grupos que já ficaram sem admin ---

-- Mesma regra da sucessão: o membro ativo mais antigo de cada grupo com
-- membros ativos e nenhum admin ativo vira admin. Grupos onde o admin certo
-- não é o mais antigo (ex.: "Os Pneu Queimado") devem ser corrigidos à mão
-- ANTES desta migration -- depois dela o grupo já terá um admin e este bloco
-- não mexe mais nele.
do $$
declare
    orphan record;
begin
    for orphan in
        select g.id
        from public.groups g
        where exists (
                select 1 from public.group_members gm
                where gm.group_id = g.id and gm.left_at is null
            )
          and not exists (
                select 1 from public.group_members gm
                where gm.group_id = g.id and gm.left_at is null and gm.role = 'admin'
            )
    loop
        perform public.promote_oldest_member_if_no_admin(orphan.id);
    end loop;
end;
$$;
