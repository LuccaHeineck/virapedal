import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useRef } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, palette } from '../constants/colors';
import { fonts } from '../constants/theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  // Enquanto true, o botão de confirmar mostra um spinner e nenhum dos dois
  // botões (nem o "voltar" do Android) fecha o diálogo.
  loading?: boolean;
  // Conteúdo extra entre a mensagem e os botões (ex.: escolher quem vira
  // admin ao sair do grupo). Fica fora do congelamento abaixo: é interativo
  // e quem usa controla o próprio estado.
  children?: ReactNode;
};

// Diálogo de confirmação para ações destrutivas (excluir, remover, sair).
// Feito à mão em vez de Alert.alert porque o Alert não aparece no web.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  icon = 'trash-outline',
  loading = false,
  children,
}: ConfirmDialogProps) {
  // Quem usa o diálogo costuma derivar o texto do mesmo estado que controla
  // `visible` -- ao fechar, esse estado vira null e o texto muda (ex.: o
  // "Excluir este pedal?" virava "Remover participante?") enquanto o fade de
  // saída ainda está na tela. Por isso o conteúdo exibido é congelado no
  // último valor de quando o diálogo estava aberto.
  const shown = useRef({ title, message, confirmLabel, icon });
  if (visible) {
    shown.current = { title, message, confirmLabel, icon };
  }
  const content = shown.current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !loading && onCancel()}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.icon}>
            <Ionicons name={content.icon} size={25} color={colors.error} />
          </View>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.message}>{content.message}</Text>
          {children ? <View style={styles.extra}>{children}</View> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={palette.surface} />
              ) : (
                <Text style={styles.confirmButtonText}>{content.confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36, 30, 26, 0.48)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 16,
    backgroundColor: palette.surface,
    alignItems: 'center',
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.errorTint,
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontFamily: fonts.displayHeavy,
    color: palette.ink,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
    textAlign: 'center',
  },
  extra: {
    width: '100%',
    marginTop: 16,
  },
  actions: {
    width: '100%',
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: fonts.display,
  },
  confirmButton: {
    backgroundColor: colors.error,
  },
  confirmButtonText: {
    color: palette.onPrimary,
    fontSize: 15,
    fontFamily: fonts.display,
  },
});
