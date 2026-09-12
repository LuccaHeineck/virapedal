import { Image, StyleSheet, Text, View } from 'react-native';
import { neutrals } from '../constants/colors';
import { useSignedImageUrl } from '../hooks/useSignedImageUrl';
import { ROUTE_PHOTOS_BUCKET } from '../lib/routePhotos';

// Uma pilha de fotos como um punhado de cópias reveladas jogadas na mesa:
// até três miniaturas sobrepostas, as de trás levemente giradas, a da
// frente reta. É o único elemento da lista com sombra e rotação -- o resto
// da linha é só tipografia, para que a pilha seja o que o olho encontra.
//
// Feita com Views absolutas e transform porque o projeto não tem
// react-native-svg nem expo-image, e um efeito de empilhar não justifica
// uma dependência.

const PRINT_SIZE = 56;
const MAX_PRINTS = 3;

// Largura/altura reservadas para a pilha inteira, contando os deslocamentos
// e a rotação das cópias de trás, para que a linha não mude de altura
// conforme o número de fotos.
export const PHOTO_STACK_SIZE = PRINT_SIZE + 16;

// Do fundo para a frente. A da frente (índice 0 = foto mais recente) fica
// reta e sem deslocamento; as de trás espiam pelas bordas.
const LAYERS = [
  { rotate: '-11deg', x: -10, y: 6 },
  { rotate: '7deg', x: 9, y: -5 },
  { rotate: '0deg', x: 0, y: 0 },
];

type PhotoStackProps = {
  paths: string[];
};

function Print({ path, rotate, x, y }: { path: string; rotate: string; x: number; y: number }) {
  const { url } = useSignedImageUrl(ROUTE_PHOTOS_BUCKET, path);

  return (
    <View style={[styles.print, { transform: [{ translateX: x }, { translateY: y }, { rotate }] }]}>
      {url ? <Image source={{ uri: url }} style={styles.image} /> : <View style={styles.image} />}
    </View>
  );
}

export function PhotoStack({ paths }: PhotoStackProps) {
  if (paths.length === 0) {
    return null;
  }

  const shown = paths.slice(0, MAX_PRINTS);
  const extra = paths.length - shown.length;
  // As camadas são fixas do fundo para a frente; com menos fotos, usa-se
  // as camadas de cima para que a da frente continue reta.
  const layers = LAYERS.slice(LAYERS.length - shown.length);

  return (
    <View style={styles.stack}>
      {shown
        .slice()
        .reverse()
        .map((path, index) => (
          <Print key={path} path={path} {...layers[index]} />
        ))}
      {extra > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: PHOTO_STACK_SIZE,
    height: PHOTO_STACK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  print: {
    position: 'absolute',
    width: PRINT_SIZE,
    height: PRINT_SIZE,
    borderRadius: 6,
    // A borda cor de papel é o que separa uma cópia da outra onde se
    // sobrepõem; sem ela as fotos viram uma mancha só.
    borderWidth: 2,
    borderColor: neutrals.paper,
    backgroundColor: neutrals.paper,
    shadowColor: neutrals.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.5,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: neutrals.hairline,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: neutrals.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: neutrals.paper,
    fontVariant: ['tabular-nums'],
  },
});
