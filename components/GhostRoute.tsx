import { StyleSheet, View } from 'react-native';
import { neutrals } from '../constants/colors';

// Um traçado fantasma: segmentos finos rotacionados que sugerem um percurso,
// sem fingir ser um mapa. Substitui a caixa cinza vazia que existia aqui --
// uma moldura sem conteúdo só ocupa espaço, um traço insinua o que vem.
//
// Feito com View rotacionada porque o projeto não tem react-native-svg, e
// adicionar a dependência por um enfeite não se justifica.
// Um pouco mais escuro que neutrals.hairline: no tom das divisórias o traço
// sumia e passava por sujeira na tela em vez de desenho.
const GHOST = '#ccd2da';

const SEGMENTS = [
  { width: 54, rotate: '-22deg' },
  { width: 46, rotate: '17deg' },
  { width: 62, rotate: '-8deg' },
  { width: 40, rotate: '26deg' },
  { width: 56, rotate: '-15deg' },
];

export function GhostRoute() {
  return (
    <View style={styles.container}>
      <View style={[styles.endpoint, styles.endpointStart]} />
      {SEGMENTS.map((segment, index) => (
        <View
          key={index}
          style={[styles.segment, { width: segment.width, transform: [{ rotate: segment.rotate }] }]}
        />
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
    height: 72,
  },
  segment: {
    height: 2,
    borderRadius: 1,
    backgroundColor: GHOST,
    marginHorizontal: -1,
  },
  endpoint: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: GHOST,
    backgroundColor: neutrals.paper,
  },
  endpointStart: {
    marginRight: 3,
  },
  endpointEnd: {
    marginLeft: 3,
    backgroundColor: GHOST,
  },
});
