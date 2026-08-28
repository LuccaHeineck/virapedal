import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { getGroupCoverPath, GROUP_IMAGES_BUCKET } from '../lib/groupImages';
import { supabase } from '../lib/supabase';

const GENERIC_PICK_ERROR = 'Não foi possível acessar suas fotos. Verifique a permissão de acesso.';
const GENERIC_UPLOAD_ERROR = 'Não foi possível enviar a imagem. Tente novamente.';

export type PickedImage = { uri: string; mimeType?: string | null };

export function useImageUpload() {
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Só seleciona a imagem localmente — usado no fluxo de criação, onde ainda
  // não existe um group_id (e portanto nenhum caminho de upload possível)
  // até o grupo ser criado.
  const pickImage = useCallback(async (): Promise<PickedImage | null> => {
    setError(null);
    setPicking(true);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(GENERIC_PICK_ERROR);
      setPicking(false);
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    setPicking(false);
    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return { uri: asset.uri, mimeType: asset.mimeType };
  }, []);

  // fetch()+arrayBuffer() lê o arquivo local sem precisar de expo-file-system,
  // que não é necessário para este fluxo (sem leitura em base64, chunking ou
  // upload em segundo plano).
  const uploadGroupCover = useCallback(async (groupId: number, image: PickedImage): Promise<{ path: string } | null> => {
    setError(null);
    setUploading(true);

    const response = await fetch(image.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(GROUP_IMAGES_BUCKET)
      .upload(getGroupCoverPath(groupId), arrayBuffer, {
        contentType: image.mimeType ?? 'image/jpeg',
        upsert: true,
      });

    setUploading(false);
    if (uploadError) {
      setError(GENERIC_UPLOAD_ERROR);
      return null;
    }

    return { path: getGroupCoverPath(groupId) };
  }, []);

  // Conveniência para o fluxo de edição, onde o grupo já existe: seleciona e
  // envia em um só passo.
  const pickAndUploadGroupCover = useCallback(
    async (groupId: number) => {
      const image = await pickImage();
      if (!image) {
        return null;
      }
      return uploadGroupCover(groupId, image);
    },
    [pickImage, uploadGroupCover]
  );

  return { pickImage, uploadGroupCover, pickAndUploadGroupCover, picking, uploading, error };
}
