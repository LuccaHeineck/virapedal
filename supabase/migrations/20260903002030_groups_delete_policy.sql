-- groups não tinha policy de DELETE -- RLS bloqueava qualquer exclusão.
-- Libera só para admin do grupo, mesmo critério da policy de UPDATE
-- ("Admins update their group"). group_members / events / group_join_requests
-- referenciam groups(id) ON DELETE CASCADE, então isso já limpa tudo.
create policy "Admins delete their group"
    on groups for delete to authenticated
    using (is_group_admin(id, auth.uid()));
