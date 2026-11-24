import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';

export function AuthDivider() {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>ou</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  text: {
    color: palette.inkSecondary,
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
});
