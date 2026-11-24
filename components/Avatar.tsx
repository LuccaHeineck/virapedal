import { Image, StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';
import { useSignedImageUrl } from '../hooks/useSignedImageUrl';
import { AVATARS_BUCKET, isExternalPhotoUrl } from '../lib/avatars';

type AvatarProps = {
  photo: string | null;
  name: string;
  size?: number;
};

// Até duas iniciais: primeira letra do primeiro e do último nome.
export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

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
      <Text style={[styles.placeholderText, { fontSize: Math.max(10, Math.round(size * 0.32)) }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: palette.segmentTrack,
  },
  placeholder: {
    backgroundColor: palette.avatarTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: fonts.display,
    color: palette.primaryInk,
  },
});
