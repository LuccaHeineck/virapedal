import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { useSignedImageUrl } from '../hooks/useSignedImageUrl';

type GroupImageProps = {
  path: string | null;
  name: string;
  size?: number;
};

export function GroupImage({ path, name, size = 72 }: GroupImageProps) {
  const { url } = useSignedImageUrl(path);
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return <Image source={{ uri: url }} style={[styles.image, dimensionStyle]} />;
  }

  return (
    <View style={[styles.placeholder, dimensionStyle]}>
      <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>
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
