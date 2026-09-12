import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { useSignedImageUrl } from '../hooks/useSignedImageUrl';
import { ROUTE_PHOTOS_BUCKET } from '../lib/routePhotos';

type RoutePhotoThumbProps = {
  path: string;
  size: number;
  onPress: () => void;
};

export function RoutePhotoThumb({ path, size, onPress }: RoutePhotoThumbProps) {
  const { url, loading } = useSignedImageUrl(ROUTE_PHOTOS_BUCKET, path);
  const dimensionStyle = { width: size, height: size };

  return (
    <TouchableOpacity style={[styles.cell, dimensionStyle]} onPress={onPress} activeOpacity={0.8}>
      {url ? (
        <Image source={{ uri: url }} style={[styles.image, dimensionStyle]} />
      ) : (
        <View style={[styles.placeholder, dimensionStyle]}>{loading ? <ActivityIndicator size="small" /> : null}</View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    backgroundColor: colors.placeholder,
  },
  placeholder: {
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
