-- Só admins podem mudar o papel (role) de um membro.
--
-- A policy "Admins manage roles, members can leave" deixa o membro fazer
-- UPDATE na própria linha (necessário para sair: preencher left_at), mas não
-- restringe colunas -- então um membro comum podia se promover a admin com
-- um update direto na API. Este trigger fecha isso: mudar role exige que
-- quem faz a chamada seja admin ativo do grupo.
--
-- Exceção: as promoções automáticas de 20261008120000_group_admin_succession
-- rodam dentro de funções SECURITY DEFINER, ou seja, com current_user igual
-- ao dono da função, não ao papel da API ('authenticated'). Por isso o
-- trigger é SECURITY INVOKER e só age sobre chamadas vindas da API.

create or replace function public.restrict_role_change_to_admins()
returns trigger as $$
begin
    if new.role is distinct from old.role
       and current_user in ('authenticated', 'anon')
       and not public.is_group_admin(old.group_id, auth.uid())
    then
        raise exception 'Apenas administradores podem alterar o papel de um membro.'
            using errcode = 'insufficient_privilege';
    end if;

    return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_group_members_restrict_role_change on public.group_members;
create trigger trg_group_members_restrict_role_change
    before update of role on public.group_members
    for each row execute function public.restrict_role_change_to_admins();

-- Mesma brecha na entrada: a policy "Join a public group or be added by an
-- admin" não restringe role, então dava para entrar num grupo público já
-- como admin. create_group() e a aprovação de solicitações inserem via
-- SECURITY DEFINER e não passam por esta checagem.
create or replace function public.restrict_admin_insert_to_admins()
returns trigger as $$
begin
    if new.role = 'admin'
       and current_user in ('authenticated', 'anon')
       and not public.is_group_admin(new.group_id, auth.uid())
    then
        raise exception 'Apenas administradores podem adicionar administradores.'
            using errcode = 'insufficient_privilege';
    end if;

    return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_group_members_restrict_admin_insert on public.group_members;
create trigger trg_group_members_restrict_admin_insert
    before insert on public.group_members
    for each row execute function public.restrict_admin_insert_to_admins();
