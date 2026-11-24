import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette } from '../constants/colors';

// Divisor de seção do design: 2px que somem nas pontas. Sem gradiente
// nativo no projeto, as pontas são dois trechos mais claros antes do traço
// cheio.
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.segment, styles.fadeFar]} />
      <View style={[styles.segment, styles.fadeNear]} />
      <View style={[styles.segment, styles.solid]} />
      <View style={[styles.segment, styles.fadeNear]} />
      <View style={[styles.segment, styles.fadeFar]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: 2,
  },
  segment: {
    height: 2,
    backgroundColor: palette.border,
  },
  fadeFar: {
    flex: 1,
    opacity: 0.3,
  },
  fadeNear: {
    flex: 1,
    opacity: 0.65,
  },
  solid: {
    flex: 14,
  },
});
