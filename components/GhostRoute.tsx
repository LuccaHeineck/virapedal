import { StyleSheet, View } from 'react-native';
import { palette } from '../constants/colors';

// Um traçado fantasma: início e fim ligados por uma linha tracejada,
// sugerindo o percurso sem fingir ser um mapa. É o estado vazio do design:
// tracejado terracota bem esmaecido.
//
// Os traços são Views separadas porque o projeto não tem react-native-svg, e
// borderStyle: 'dashed' em um lado só é inconsistente no Android.
const DASH_COUNT = 12;

export function GhostRoute() {
  return (
    <View style={styles.container}>
      <View style={styles.endpoint} />
      {Array.from({ length: DASH_COUNT }, (_, index) => (
        <View key={index} style={styles.dash} />
      ))}
      <View style={[styles.endpoint, styles.endpointEnd]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 48,
    opacity: 0.45,
  },
  dash: {
    width: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.primary,
  },
  endpoint: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: palette.primary,
    backgroundColor: palette.bg,
  },
  endpointEnd: {
    backgroundColor: palette.primary,
  },
});
