// Tokens do guia visual do design. Os valores do protótipo estão em
// oklch; aqui vai a conversão sRGB, já que o React Native não entende oklch.
//
// Direção: terracota como cor de ação, teal escuro como secundária (agendado,
// público), fundos creme quentes e tinta quase-preta quente. Sem pastéis
// frios, sem gradientes, sem sombras pesadas.
export const palette = {
  bg: '#f9f0e9',
  surface: '#fffdf9',
  surfaceMuted: '#fbf6f1',
  segmentTrack: '#e5dcd7',
  border: '#e0d7d2',

  ink: '#241e1a',
  inkSecondary: '#665b53',
  inkInactive: '#78706b',
  // Texto da opção inativa do segmented control.
  segmentInk: '#71665f',

  primary: '#c33e00',
  primaryHover: '#aa2400',
  primaryInk: '#a02300',
  primaryInkStrong: '#8f1a00',
  primaryTint: '#fae2d8',
  avatarTint: '#ffd5c4',
  onPrimary: '#fffbf6',

  teal: '#005455',
  tealTint: '#c7eded',
  green: '#235b28',
  greenTint: '#d4f1d4',
  amber: '#6c4300',
  amberTint: '#fee9be',
  neutralTag: '#665b53',
  neutralTagTint: '#ebe3dd',

  // O design não define um vermelho de erro; este fica no mesmo registro
  // quente do resto da paleta, mas distinto do terracota de ação.
  error: '#b3261e',
  errorTint: '#fbe1dd',
};

// Modo gravação (tela escura).
export const live = {
  bg: '#18120f',
  card: '#2a221e',
  ink: '#f9f4f0',
  accent: '#d84a00',
  border: 'rgba(255,255,255,0.2)',
  mapBorder: 'rgba(255,255,255,0.1)',
};

// Nomes antigos, mantidos para que as telas existentes herdem a paleta nova.
export const colors = {
  primary: palette.primary,
  error: palette.error,
  success: palette.green,
  border: palette.border,
  background: palette.bg,
  surface: palette.surface,
  placeholder: palette.segmentTrack,
};

export const neutrals = {
  ink: palette.ink,
  slate: palette.inkSecondary,
  mute: palette.inkInactive,
  hairline: palette.border,
  paper: palette.bg,
};
