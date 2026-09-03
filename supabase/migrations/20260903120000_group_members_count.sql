-- Contagem de membros ativos por grupo, para exibir no card e na tela do grupo.
--
-- Não dá para contar isso no cliente com um count(*) em group_members: a
-- policy "View membership of your groups" só deixa enxergar as linhas de
-- membership de grupos dos quais você já participa, então todo grupo da aba
-- "Descobrir" (públicos dos quais não sou membro) retornaria 0.
--
-- Esta função é exposta como "computed column" do PostgREST: recebe uma
-- linha de public.groups e o cliente pode pedir `select=...,members_count`
-- que o valor volta embutido em cada grupo. É SECURITY DEFINER para o
-- count() ignorar a RLS de group_members -- só expõe um inteiro, nunca as
-- linhas em si, e apenas para grupos que o chamador já consegue ver (a
-- linha-pai precisa passar pela RLS de groups de qualquer forma).
create or replace function public.members_count(g public.groups)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.group_members gm
  where gm.group_id = g.id and gm.left_at is null;
$$;

-- Mesmo padrão de create_group(): funções em public são executáveis por
-- PUBLIC (anon + authenticated) por padrão; sendo SECURITY DEFINER, restringe
-- para apenas usuários autenticados.
revoke execute on function public.members_count(public.groups) from public;
grant execute on function public.members_count(public.groups) to authenticated;
