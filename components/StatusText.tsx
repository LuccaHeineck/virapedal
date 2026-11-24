import { StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
import { fonts } from '../constants/theme';

type StatusTextProps = {
  children: string;
  variant: 'error' | 'success';
};

export function StatusText({ children, variant }: StatusTextProps) {
  return <Text style={[styles.base, variant === 'error' ? styles.error : styles.success]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.error,
  },
  success: {
    color: colors.success,
  },
});
