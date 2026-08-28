import { StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

type StatusTextProps = {
  children: string;
  variant: 'error' | 'success';
};

export function StatusText({ children, variant }: StatusTextProps) {
  return <Text style={variant === 'error' ? styles.error : styles.success}>{children}</Text>;
}

const styles = StyleSheet.create({
  error: {
    color: colors.error,
  },
  success: {
    color: colors.success,
  },
});
