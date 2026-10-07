import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { useSignedImageUrl } from '../hooks/useSignedImageUrl';
import { AVATARS_BUCKET, isExternalPhotoUrl } from '../lib/avatars';

type AvatarProps = {
  photo: string | null;
  name: string;
  size?: number;
};

export function Avatar({ photo, name, size = 44 }: AvatarProps) {
  const storagePath = photo && !isExternalPhotoUrl(photo) ? photo : null;
  const { url: signedUrl } = useSignedImageUrl(AVATARS_BUCKET, storagePath);
  const uri = storagePath ? signedUrl : photo;

  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, shape]} />;
  }

  return (
    <View style={[styles.placeholder, shape]}>
      <Text style={[styles.placeholderText, { fontSize: Math.round(size * 0.4) }]}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.placeholder,
  },
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontWeight: '600',
  },
});
