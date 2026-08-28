import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';

export function LoadingView() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
});
