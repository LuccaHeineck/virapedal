import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';
import { SegmentedControl } from './SegmentedControl';
import { Squiggle } from './Squiggle';

type AuthMode = 'login' | 'signup';

type AuthShellProps = {
  // Login e cadastro ganham o segmentado "Entrar / Cadastrar"; telas de
  // recuperação de senha passam null e mostram só a marca.
  mode: AuthMode | null;
  children: ReactNode;
};

const MODES: { key: AuthMode; label: string }[] = [
  { key: 'login', label: 'Entrar' },
  { key: 'signup', label: 'Cadastrar' },
];

const WORDMARK_LINE: [number, number][] = [
  [1, 8],
  [14, 3],
  [27, 7],
  [40, 2],
  [59, 6],
];

// Moldura das telas de autenticação: marca "Virapedal" com o traço em
// zigue-zague, slogan, segmentado e, no rodapé, a nota de privacidade.
export function AuthShell({ mode, children }: AuthShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 44, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.wordmark}>Virapedal</Text>
          <Squiggle points={WORDMARK_LINE} width={60} height={10} style={styles.wordmarkLine} />
          <Text style={styles.tagline}>Pedais em grupo, planejados juntos.</Text>
        </View>

        {mode ? (
          <SegmentedControl
            options={MODES}
            active={mode}
            // replace: alternar entre as duas não deve empilhar telas.
            onChange={(next) => next !== mode && router.replace(next === 'login' ? '/login' : '/signup')}
            style={styles.modes}
          />
        ) : null}

        <View style={styles.form}>{children}</View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Ionicons name="lock-closed-outline" size={15} color={palette.inkSecondary} style={styles.footerIcon} />
          <Text style={styles.footerText}>
            Grupos privados continuam privados. Membros entram por solicitação e os admins aprovam quem vê os detalhes
            dos pedais.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 26,
  },
  brand: {
    marginBottom: 30,
  },
  wordmark: {
    fontFamily: fonts.displayHeavy,
    fontSize: 27,
    letterSpacing: -0.27,
    color: palette.ink,
    marginBottom: 8,
  },
  wordmarkLine: {
    marginBottom: 12,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 20,
    color: palette.ink,
    opacity: 0.72,
  },
  modes: {
    marginBottom: 26,
  },
  form: {
    gap: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 28,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingTop: 20,
    borderTopWidth: 1.5,
    borderTopColor: palette.border,
  },
  footerIcon: {
    marginTop: 2,
  },
  footerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: palette.ink,
    opacity: 0.68,
  },
});
