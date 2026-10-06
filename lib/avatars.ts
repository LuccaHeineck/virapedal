export const AVATARS_BUCKET = 'avatars';

// Um objeto novo por envio (em vez de upsert num caminho fixo como a capa de
// grupo): o cache de signed URL é chaveado pelo caminho, então reaproveitar o
// mesmo caminho continuaria mostrando a foto antiga.
export function getAvatarPath(userId: string): string {
  return `${userId}/${Date.now()}`;
}

// profile_photo_url guarda uma URL externa (foto do Google) ou um caminho no
// bucket `avatars` (foto enviada pelo usuário).
export function isExternalPhotoUrl(photo: string): boolean {
  return /^https?:\/\//.test(photo);
}
