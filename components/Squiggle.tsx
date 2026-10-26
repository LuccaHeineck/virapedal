import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette } from '../constants/colors';

type SquiggleProps = {
  // Pontos [x, y] da linha, no sistema de coordenadas width×height.
  points: [number, number][];
  width: number;
  height: number;
  strokeWidth?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

// Linha em zigue-zague decorativa (o traço do logo, o mini traçado dos cards
// de rota). Sem react-native-svg no projeto, cada trecho é uma View girada
// em torno do próprio centro.
export function Squiggle({ points, width, height, strokeWidth = 2, color = palette.primary, style }: SquiggleProps) {
  return (
    <View style={[{ width, height }, style]}>
      {points.slice(1).map(([x2, y2], index) => {
        const [x1, y1] = points[index];
        const length = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                width: length + strokeWidth,
                height: strokeWidth,
                borderRadius: strokeWidth / 2,
                backgroundColor: color,
                left: (x1 + x2) / 2 - (length + strokeWidth) / 2,
                top: (y1 + y2) / 2 - strokeWidth / 2,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
  },
});
