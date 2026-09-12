export const ROUTE_PHOTOS_BUCKET = 'route-photos';

// Ao contrário da capa de grupo (um objeto por grupo, sempre no mesmo
// caminho via upsert), uma rota pode ter várias fotos -- cada envio precisa
// de um caminho único para não sobrescrever o anterior. Sem extensão: o
// content type é definido explicitamente no upload.
export function getRoutePhotoPath(routeId: number, fileId: string): string {
  return `${routeId}/${fileId}`;
}
