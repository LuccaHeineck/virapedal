import { StyleSheet, View } from 'react-native';
import { neutrals } from '../constants/colors';

// Um traçado fantasma: início e fim ligados por uma linha tracejada reta,
// sugerindo o percurso sem fingir ser um mapa.
//
// Os traços são Views separadas porque o projeto não tem react-native-svg, e
// borderStyle: 'dashed' em um lado só é inconsistente no Android.
// Um pouco mais escuro que neutrals.hairline: no tom das divisórias o traço
// sumia e passava por sujeira na tela em vez de desenho.
const GHOST = '#ccd2da';
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
  },
  dash: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: GHOST,
  },
  endpoint: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: GHOST,
    backgroundColor: neutrals.paper,
  },
  endpointEnd: {
    backgroundColor: GHOST,
  },
});
