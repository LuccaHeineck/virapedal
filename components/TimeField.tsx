import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

type TimeFieldProps = {
  label: string;
  value: string; // 'HH:MM', ou '' se ainda não escolhido
  onChange: (value: string) => void;
  disabled?: boolean;
};

function toDate(value: string): Date {
  const date = new Date();
  if (!value) {
    return date;
  }
  const [hours, minutes] = value.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function TimeField({ label, value, onChange, disabled }: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pendingTime, setPendingTime] = useState(() => toDate(value));

  // @react-native-community/datetimepicker não tem implementação web -- o
  // <input type="time"> nativo do navegador já traz seletor próprio.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        {createElement('input', {
          type: 'time',
          value,
          disabled,
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
          style: styles.webInput,
        })}
      </View>
    );
  }

  function openPicker() {
    setPendingTime(toDate(value));
    setShowPicker(true);
  }

  function handleConfirm() {
    onChange(toTimeString(pendingTime));
    setShowPicker(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TouchableOpacity style={[styles.input, styles.inputFlex]} onPress={openPicker} disabled={disabled}>
          <Text style={value ? styles.valueText : styles.placeholderText}>{value || 'Selecionar horário'}</Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} disabled={disabled} hitSlop={8} accessibilityLabel="Limpar horário" accessibilityRole="button">
            <Ionicons name="close-circle" size={22} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Android mostra o diálogo nativo do sistema direto, sem overlay
          próprio -- ele já se comporta como um modal sozinho. */}
      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={pendingTime}
          mode="time"
          is24Hour
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (event.type === 'set' && selectedDate) {
              onChange(toTimeString(selectedDate));
            }
          }}
        />
      ) : null}

      {/* iOS: "inline"/"compact" para mode="time" empurravam o layout da
          tela pra baixo do campo e conflitavam com o toque no botão de
          limpar. Um modal próprio (bottom sheet com spinner) isola o
          picker do resto da tela e dá um "Cancelar" de verdade. */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowPicker(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={8}>
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
                  <Text style={styles.doneButtonText}>Concluído</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingTime}
                mode="time"
                is24Hour
                display="spinner"
                // O picker nativo segue o tema do sistema: com o iPhone em
                // modo escuro ele desenha os números em branco, que somem
                // contra o fundo branco fixo deste sheet.
                themeVariant="light"
                textColor="#000"
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setPendingTime(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  valueText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  webInput: {
    // Ver comentário equivalente em DateField.tsx -- sem borderStyle, o
    // navegador ignora borderWidth/borderColor num <input> cru.
    boxSizing: 'border-box',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    color: '#888',
    fontSize: 16,
  },
  doneButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});
