import { useCallback, useEffect, useState } from 'react';
import { GROUP_IMAGES_BUCKET } from '../lib/groupImages';
import { supabase } from '../lib/supabase';

const DEFAULT_EXPIRES_IN = 60 * 60; // 1 hora

type CacheEntry = { url: string; expiresAt: number };

// Cache em nível de módulo (não por componente) para que a lista, o detalhe
// e a pré-visualização de edição reaproveitem a mesma signed URL enquanto
// ela for válida, em vez de cada tela solicitar a sua.
const signedUrlCache = new Map<string, CacheEntry>();

export function useSignedImageUrl(path: string | null, expiresIn: number = DEFAULT_EXPIRES_IN) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const fetchUrl = useCallback(
    async (forceRefresh = false) => {
      if (!path) {
        setUrl(null);
        setLoading(false);
        setError(null);
        return;
      }

      const cached = signedUrlCache.get(path);
      if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
        setUrl(cached.url);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: signError } = await supabase.storage
        .from(GROUP_IMAGES_BUCKET)
        .createSignedUrl(path, expiresIn);

      if (signError || !data) {
        // Uma URL ausente aqui pode significar "sem acesso" (RLS) ou "objeto
        // não existe" — não há como distinguir a partir do erro do storage,
        // então nenhuma mensagem específica é exibida; o chamador trata como
        // "sem imagem".
        setError('Não foi possível carregar a imagem.');
        setLoading(false);
        return;
      }

      signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 });
      setUrl(data.signedUrl);
      setLoading(false);
    },
    [path, expiresIn]
  );

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  const refresh = useCallback(() => fetchUrl(true), [fetchUrl]);

  return { url, loading, error, refresh };
}
