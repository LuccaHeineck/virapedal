import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_EXPIRES_IN = 60 * 60; // 1 hora

type CacheEntry = { url: string; expiresAt: number };

// Cache em nível de módulo (não por componente) para que a lista, o detalhe
// e a pré-visualização de edição reaproveitem a mesma signed URL enquanto
// ela for válida, em vez de cada tela solicitar a sua. Chave inclui o bucket
// -- caminhos como "42/cover" existem em mais de um bucket (group-images,
// route-photos), então path sozinho colidiria entre eles.
const signedUrlCache = new Map<string, CacheEntry>();

export function useSignedImageUrl(bucket: string, path: string | null, expiresIn: number = DEFAULT_EXPIRES_IN) {
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

      const cacheKey = `${bucket}:${path}`;
      const cached = signedUrlCache.get(cacheKey);
      if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
        setUrl(cached.url);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

      if (signError || !data) {
        // Uma URL ausente aqui pode significar "sem acesso" (RLS) ou "objeto
        // não existe" — não há como distinguir a partir do erro do storage,
        // então nenhuma mensagem específica é exibida; o chamador trata como
        // "sem imagem".
        setError('Não foi possível carregar a imagem.');
        setLoading(false);
        return;
      }

      signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 });
      setUrl(data.signedUrl);
      setLoading(false);
    },
    [bucket, path, expiresIn]
  );

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  const refresh = useCallback(() => fetchUrl(true), [fetchUrl]);

  return { url, loading, error, refresh };
}
