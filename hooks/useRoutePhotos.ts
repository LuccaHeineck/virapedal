import { useCallback, useEffect, useState } from 'react';
import { getRoutePhotoPath, ROUTE_PHOTOS_BUCKET } from '../lib/routePhotos';
import { supabase } from '../lib/supabase';
import { useImageUpload } from './useImageUpload';

// Solução provisória escrita à mão até que os tipos reais sejam gerados via
// `npx supabase gen types typescript` (ver lib/supabase.ts).
export type RoutePhoto = {
  id: number;
  route_id: number;
  uploaded_by: string;
  // Caminho dentro do bucket privado route-photos, não uma URL navegável.
  // Renderize via useSignedImageUrl(ROUTE_PHOTOS_BUCKET, ...).
  image_url: string;
  caption: string | null;
  created_at: string;
};

export const ROUTE_PHOTO_COLUMNS = 'id, route_id, uploaded_by, image_url, caption, created_at';

const GENERIC_LOAD_ERROR = 'Não foi possível carregar as fotos. Tente novamente.';
const GENERIC_UPLOAD_ERROR = 'Não foi possível enviar a foto. Tente novamente.';
const GENERIC_DELETE_ERROR = 'Não foi possível excluir a foto. Tente novamente.';

export function useRoutePhotos(routeId: number) {
  const [photos, setPhotos] = useState<RoutePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { pickImage } = useImageUpload();

  // Visível ao gravador sempre, e a quem pode ver o pedal vinculado -- mesmo
  // RLS de routes. Lista vazia é um estado legítimo (rota sem fotos ainda).
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('route_photos')
      .select(ROUTE_PHOTO_COLUMNS)
      .eq('route_id', routeId)
      .order('created_at', { ascending: false })
      .returns<RoutePhoto[]>();

    if (selectError || !data) {
      setError(GENERIC_LOAD_ERROR);
      setLoading(false);
      return;
    }

    setPhotos(data);
    setLoading(false);
  }, [routeId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Permitido pelo RLS só para o gravador da rota -- a tela já esconde o
  // botão de adicionar para os demais, isto é reforço, não a regra real.
  const addPhoto = useCallback(async (): Promise<boolean> => {
    const image = await pickImage();
    if (!image) {
      return false;
    }

    setAdding(true);
    setAddError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setAddError(GENERIC_UPLOAD_ERROR);
      setAdding(false);
      return false;
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = getRoutePhotoPath(routeId, fileId);

    const response = await fetch(image.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(ROUTE_PHOTOS_BUCKET)
      .upload(path, arrayBuffer, { contentType: image.mimeType ?? 'image/jpeg' });

    if (uploadError) {
      setAddError(GENERIC_UPLOAD_ERROR);
      setAdding(false);
      return false;
    }

    const { error: insertError } = await supabase.from('route_photos').insert({
      route_id: routeId,
      uploaded_by: userData.user.id,
      image_url: path,
    });

    setAdding(false);
    if (insertError) {
      // O objeto já foi enviado ao Storage, mas sem a linha em route_photos
      // ele nunca aparece na galeria -- limpa para não deixar lixo órfão.
      await supabase.storage.from(ROUTE_PHOTOS_BUCKET).remove([path]);
      setAddError(GENERIC_UPLOAD_ERROR);
      return false;
    }

    await fetchPhotos();
    return true;
  }, [routeId, pickImage, fetchPhotos]);

  // Apaga a linha antes do objeto no Storage -- se o Storage falhar depois,
  // sobra um arquivo órfão (inofensivo); na ordem inversa, uma falha na
  // linha deixaria uma foto quebrada visível na galeria.
  const deletePhoto = useCallback(async (photo: RoutePhoto): Promise<boolean> => {
    setDeletingId(photo.id);
    setDeleteError(null);

    const { error: deleteRowError } = await supabase.from('route_photos').delete().eq('id', photo.id);

    if (deleteRowError) {
      setDeleteError(GENERIC_DELETE_ERROR);
      setDeletingId(null);
      return false;
    }

    await supabase.storage.from(ROUTE_PHOTOS_BUCKET).remove([photo.image_url]);

    setPhotos((current) => current.filter((p) => p.id !== photo.id));
    setDeletingId(null);
    return true;
  }, []);

  return { photos, loading, error, refresh: fetchPhotos, addPhoto, adding, addError, deletePhoto, deletingId, deleteError };
}
