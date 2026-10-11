import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';

type AvatarStackPerson = {
  key: string | number;
  name: string;
  photo: string | null;
};

type AvatarStackProps = {
  people: AvatarStackPerson[];
  // Total real de pessoas (pode ser maior que `people`): o que passar de
  // `max` é indicado no fim da fileira, conforme `overflowStyle`.
  total: number;
  max?: number;
  size?: number;
  // Como indicar quem passou de `max`: 'count' mostra um círculo "+N";
  // 'fade' mostra círculos cinzas sumindo aos poucos, só sugerindo que há
  // mais gente (para quando o número já aparece em outro lugar).
  overflowStyle?: 'count' | 'fade';
  // Cor do anel que separa as fotos sobrepostas. Deve ser a cor do fundo
  // onde a fileira está: num fundo cinza, um anel branco vira um contorno
  // visível em volta de cada foto.
  ringColor?: string;
};

// Rastro 'fade', do círculo mais perto ao mais longe: cada um menor (fração
// do tamanho da foto) e mais transparente que o anterior, para ler como
// "a fileira continua" e não como mais uma pessoa sem foto.
const FADE_STEPS = [
  { scale: 0.8, opacity: 0.9 },
  { scale: 0.62, opacity: 0.5 },
];

const RING_WIDTH = 2;

// Fileira de fotos sobrepostas, como os "participantes" de redes sociais:
// algumas caras e uma indicação do resto, em vez da lista inteira.
export function AvatarStack({
  people,
  total,
  max = 4,
  size = 24,
  overflowStyle = 'count',
  ringColor = '#fff',
}: AvatarStackProps) {
  const shown = people.slice(0, max);
  const overflow = Math.max(total - shown.length, 0);
  // Sobreposição de ~1/3 do diâmetro: dá para reconhecer cada rosto sem a
  // fileira ficar comprida.
  const overlap = Math.round(size / 3);

  const ringFor = (inner: number) => ({
    width: inner + RING_WIDTH * 2,
    height: inner + RING_WIDTH * 2,
    borderRadius: (inner + RING_WIDTH * 2) / 2,
    backgroundColor: ringColor,
  });

  return (
    <View style={styles.row}>
      {shown.map((person, index) => (
        <View key={person.key} style={[styles.ring, ringFor(size), styles.face, index > 0 && { marginLeft: -overlap }]}>
          <Avatar photo={person.photo} name={person.name} size={size} />
        </View>
      ))}

      {overflow > 0 && overflowStyle === 'fade'
        ? FADE_STEPS.map(({ scale, opacity }, index) => {
            const inner = Math.round(size * scale);
            // O primeiro sai de trás da última foto com a sobreposição
            // normal; o seguinte fica bem colado nele (~55% por baixo).
            const marginLeft = index === 0 ? -overlap : -Math.round(size * FADE_STEPS[0].scale * 0.55);
            return (
              // zIndex decrescente: o rastro passa por trás da última foto e
              // cada círculo por trás do anterior.
              <View key={scale} style={[styles.ring, ringFor(inner), { marginLeft, zIndex: FADE_STEPS.length - index }]}>
                <View style={[styles.faded, { width: inner, height: inner, borderRadius: inner / 2, opacity }]} />
              </View>
            );
          })
        : null}

      {overflow > 0 && overflowStyle === 'count' ? (
        <View style={[styles.ring, ringFor(size), shown.length > 0 && { marginLeft: -overlap }]}>
          <View style={[styles.more, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.moreText, { fontSize: Math.round(size * 0.38) }]}>+{overflow}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Anel em volta de cada foto, para separar as sobrepostas.
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // As fotos ficam acima do rastro 'fade'.
  face: {
    zIndex: FADE_STEPS.length + 1,
  },
  faded: {
    backgroundColor: '#8a919c',
  },
  more: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eceef2',
  },
  moreText: {
    fontWeight: '700',
    color: '#4b5563',
  },
});
