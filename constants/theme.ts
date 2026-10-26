import { StyleSheet } from 'react-native';
import { palette } from './colors';

// Famílias carregadas em app/_layout.tsx. Cada peso é uma família própria:
// com fonte customizada, fontWeight no Android não escolhe o arquivo certo,
// então os estilos usam só fontFamily.
//
// Sora: títulos, botões e números. Work Sans: texto corrido e UI.
export const fonts = {
  display: 'Sora_700Bold',
  displaySemi: 'Sora_600SemiBold',
  displayHeavy: 'Sora_800ExtraBold',
  body: 'WorkSans_400Regular',
  bodyMedium: 'WorkSans_500Medium',
  bodySemi: 'WorkSans_600SemiBold',
  bodyBold: 'WorkSans_700Bold',
};

export const radii = {
  input: 10,
  button: 12,
  card: 14,
  pill: 20,
  round: 999,
};

// Padding horizontal das telas.
export const SCREEN_GUTTER = 22;

// Única sombra do app: 0 1px 3px rgba(40,25,15,.06).
export const cardShadow = {
  shadowColor: 'rgb(40,25,15)',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 1,
};

// Cabeçalho das telas internas das pilhas: mesmo creme do fundo, sem
// sombra, "voltar" em ink-secondary e título em Sora.
export const stackScreenOptions = {
  headerStyle: { backgroundColor: palette.bg },
  headerShadowVisible: false,
  headerTintColor: palette.inkSecondary,
  headerTitleStyle: { fontFamily: fonts.display, fontSize: 16, color: palette.ink },
  headerBackTitleStyle: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  contentStyle: { backgroundColor: palette.bg },
};

export const type = StyleSheet.create({
  // Título das abas principais (Grupos, Pedais, Atividade).
  screenTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 23,
    color: palette.ink,
  },
  // Título de telas internas (detalhes, criação).
  detailTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 21,
    color: palette.ink,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: palette.ink,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: palette.ink,
  },
  // h5 do design: 13px com opacidade .7.
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: palette.ink,
    opacity: 0.7,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17.5,
    color: palette.ink,
    opacity: 0.72,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: palette.ink,
    opacity: 0.7,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.ink,
    opacity: 0.62,
  },
  eyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    letterSpacing: 0.42,
    textTransform: 'uppercase',
    color: palette.primary,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: palette.ink,
    opacity: 0.55,
    textAlign: 'center',
  },
});
