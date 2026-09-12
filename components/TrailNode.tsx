import { StyleSheet, View } from 'react-native';
import { colors, neutrals } from '../constants/colors';

// Os nós da trilha. "live" é o único que usa azul -- é o sinal de "gravando
// agora", e por isso ganha também o halo, que nenhum outro estado tem.
export type TrailNodeVariant = 'live' | 'open' | 'done' | 'past';

const NODE_SIZE = 9;
const HALO_SIZE = 20;

export function TrailNode({ variant }: { variant: TrailNodeVariant }) {
  if (variant === 'live') {
    return (
      <View style={styles.halo}>
        <View style={[styles.dot, styles.dotLive]} />
      </View>
    );
  }

  return (
    <View style={styles.slot}>
      <View style={[styles.dot, variant === 'open' ? styles.dotOpen : variant === 'done' ? styles.dotDone : styles.dotPast]} />
    </View>
  );
}

// Largura que a calha da trilha precisa reservar para o maior nó (o halo),
// para que a linha fique alinhada em todas as variantes.
export const TRAIL_GUTTER = HALO_SIZE;

const styles = StyleSheet.create({
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: '#e3ecfd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
  },
  dotLive: {
    backgroundColor: colors.primary,
  },
  // Evento registrado (Iniciada / Finalizada) -- contorno firme em ink.
  dotOpen: {
    backgroundColor: neutrals.paper,
    borderWidth: 1.5,
    borderColor: neutrals.ink,
  },
  dotDone: {
    backgroundColor: neutrals.ink,
  },
  // Rota concluída na lista -- presente, mas sem pedir atenção.
  dotPast: {
    backgroundColor: neutrals.paper,
    borderWidth: 1.5,
    borderColor: neutrals.hairline,
  },
});
