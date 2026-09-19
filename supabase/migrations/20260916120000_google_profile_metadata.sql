-- O login/cadastro via Google preenche raw_user_meta_data com chaves diferentes
-- das usadas pelo cadastro por e-mail (name/profile_photo_url): o Supabase copia
-- os campos padrão do provider Google como full_name e avatar_url. Sem este
-- ajuste, toda conta criada via Google cairia no fallback "New rider" e sem foto.
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.users (id, name, profile_photo_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'New rider'),
        coalesce(new.raw_user_meta_data->>'profile_photo_url', new.raw_user_meta_data->>'avatar_url')
    );
    return new;
end;
$$ language plpgsql security definer set search_path = '';
