export const GROUP_IMAGES_BUCKET = 'group-images';

// No extension: content type is set explicitly on upload, so the path never
// changes on edit and upsert:true always replaces the same object.
export function getGroupCoverPath(groupId: number): string {
  return `${groupId}/cover`;
}
