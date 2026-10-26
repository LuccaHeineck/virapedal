import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../constants/colors';
import { fonts, SCREEN_GUTTER, type } from '../constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  // Botões à direita do título (IconButton).
  actions?: ReactNode;
  // Topo de 26px nas abas principais; o Perfil usa 32.
  topPadding?: number;
};

// Cabeçalho das abas principais: as telas raiz não têm header nativo, então
// o título (Sora 800 23) vive dentro da tela, abaixo da área segura.
export function ScreenHeader({ title, subtitle, actions, topPadding = 26 }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPadding }]}>
      <View style={styles.row}>
        <Text style={[type.screenTitle, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

type IconButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: keyof typeof Ionicons.glyphMap;
  // Iniciais no lugar do ícone (botão de perfil).
  initials?: string;
};

// Botão-ícone circular 36×36 sobre o trilho bege.
export function IconButton({ onPress, accessibilityLabel, icon, initials }: IconButtonProps) {
  return (
    <TouchableOpacity
      style={styles.iconButton}
      onPress={onPress}
      hitSlop={6}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      {initials ? (
        <Text style={styles.initials}>{initials}</Text>
      ) : icon ? (
        <Ionicons name={icon} size={18} color={palette.ink} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.ink,
    opacity: 0.6,
    marginTop: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.segmentTrack,
  },
  initials: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: palette.primaryInk,
  },
});
