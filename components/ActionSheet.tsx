import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../constants/colors';
import { fonts } from '../constants/theme';

export type ActionSheetOption = {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  tone?: 'default' | 'danger';
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
  // Cabeçalho opcional acima das opções (ex.: foto e nome do membro).
  header?: ReactNode;
};

// No iOS, um Modal não abre enquanto outro ainda está na animação de saída
// -- uma opção que abre um ConfirmDialog (ex.: "Remover do grupo") não
// apareceria. A ação espera o menu terminar de fechar.
const IOS_DISMISS_DELAY_MS = 300;

// Menu de ações que sobe da parte de baixo da tela, no padrão dos apps de
// redes sociais. Tocar fora ou em "Cancelar" fecha sem fazer nada.
export function ActionSheet({ visible, onClose, options, header }: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  // Mesmo motivo do ConfirmDialog: quem usa costuma zerar o estado que gera
  // o conteúdo ao fechar, e o texto mudaria durante a animação de saída.
  const shown = useRef({ options, header });
  if (visible) {
    shown.current = { options, header };
  }
  const content = shown.current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar menu">
        {/* Pressable interno sem ação: toques no painel não fecham o menu. */}
        <Pressable style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]} onPress={() => {}}>
          <View style={styles.handle} />
          {content.header ? <View style={styles.header}>{content.header}</View> : null}

          {content.options.map((option) => {
            const danger = option.tone === 'danger';
            return (
              <TouchableOpacity
                key={option.key}
                style={styles.option}
                onPress={() => {
                  onClose();
                  if (Platform.OS === 'ios') {
                    setTimeout(option.onPress, IOS_DISMISS_DELAY_MS);
                  } else {
                    option.onPress();
                  }
                }}
                accessibilityRole="button">
                <View style={[styles.optionIcon, danger ? styles.optionIconDanger : styles.optionIconDefault]}>
                  <Ionicons name={option.icon} size={18} color={danger ? colors.error : colors.primary} />
                </View>
                <Text style={[styles.optionLabel, danger && styles.optionLabelDanger]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.cancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(36, 30, 26, 0.48)',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: palette.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    marginBottom: 8,
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconDefault: {
    backgroundColor: palette.primaryTint,
  },
  optionIconDanger: {
    backgroundColor: palette.errorTint,
  },
  optionLabel: {
    fontSize: 14.5,
    fontFamily: fonts.display,
    color: palette.ink,
  },
  optionLabelDanger: {
    color: colors.error,
  },
  cancel: {
    marginTop: 8,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: fonts.bodySemi,
    color: palette.inkSecondary,
  },
});
