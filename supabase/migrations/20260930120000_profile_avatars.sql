-- Fotos de perfil: corrige a foto do Google que não chegava em public.users e
-- cria o bucket para fotos enviadas pelo próprio usuário.
--
-- Por que a foto do Google faltava: handle_new_user só roda em INSERT em
-- auth.users. Contas criadas antes de 20260916120000_google_profile_metadata.sql
-- nunca foram reprocessadas, e entrar com Google num e-mail que já tinha conta
-- por senha só vincula a identidade (UPDATE em auth.users) -- o trigger de
-- INSERT não dispara, embora o Supabase mescle avatar_url/picture em
-- raw_user_meta_data.
--
-- profile_photo_url passa a guardar ou uma URL externa (https://, Google) ou
-- um caminho no bucket `avatars` (foto enviada) -- components/Avatar.tsx
-- trata os dois casos.

create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.users (id, name, profile_photo_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'New rider'),
        coalesce(
            new.raw_user_meta_data->>'profile_photo_url',
            new.raw_user_meta_data->>'avatar_url',
            new.raw_user_meta_data->>'picture'
        )
    );
    return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Preenche a foto só quando ainda não há nenhuma, para nunca sobrescrever uma
-- foto escolhida pelo usuário a cada novo login com Google.
create or replace function public.handle_user_metadata_update()
returns trigger as $$
begin
    update public.users
    set profile_photo_url = coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
    where id = new.id
      and profile_photo_url is null
      and coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture') is not null;
    return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_auth_user_metadata_updated
    after update of raw_user_meta_data on auth.users
    for each row execute function public.handle_user_metadata_update();

-- Backfill das contas que já existiam.
update public.users u
set profile_photo_url = coalesce(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture')
from auth.users au
where au.id = u.id
  and u.profile_photo_url is null
  and coalesce(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture') is not null;

-- Bucket privado para fotos enviadas. Caminho: {user_id}/{timestamp} -- um
-- objeto novo a cada envio, para que nem o cache de signed URL (chaveado pelo
-- caminho, ver hooks/useSignedImageUrl.ts) nem o cache de imagem do RN
-- mostrem a foto antiga. Qualquer usuário autenticado pode ler: avatares
-- aparecem em membros, solicitações e participantes de vários grupos.
--
-- `name` sempre qualificado como `objects.name` (ver
-- 20260902000000_fix_group_cover_read_policy_column_shadowing.sql).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "Authenticated users read avatars"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(objects.name))[1] = auth.uid()::text
);

create policy "Users delete their own avatar object"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner = auth.uid()
);
