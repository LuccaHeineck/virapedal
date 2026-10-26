import { Image, StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';
import { useSignedImageUrl } from '../hooks/useSignedImageUrl';
import { GROUP_IMAGES_BUCKET } from '../lib/groupImages';

type GroupImageProps = {
  path: string | null;
  name: string;
  size?: number;
  // Capa de largura total (detalhe do grupo): ocupa o espaço do container
  // em vez de um quadrado de `size`.
  cover?: boolean;
  radius?: number;
};

// Thumbs de grupo são quadrados de raio 10, como no design -- o círculo fica
// reservado para pessoas (Avatar).
export function GroupImage({ path, name, size = 72, cover = false, radius = 10 }: GroupImageProps) {
  const { url } = useSignedImageUrl(GROUP_IMAGES_BUCKET, path);
  const dimensionStyle = cover
    ? { width: '100%' as const, height: '100%' as const, borderRadius: radius }
    : { width: size, height: size, borderRadius: radius };
  const letterSize = cover ? 44 : size * 0.4;

  if (url) {
    return <Image source={{ uri: url }} style={[styles.image, dimensionStyle]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.placeholder, dimensionStyle]}>
      <Text style={[styles.placeholderText, { fontSize: letterSize }]}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: palette.segmentTrack,
  },
  placeholder: {
    backgroundColor: palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: fonts.displayHeavy,
    color: palette.primaryInk,
  },
});
