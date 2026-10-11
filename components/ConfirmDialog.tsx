import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useRef } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

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
                <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f0',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
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
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.error,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
