import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

type DateFieldProps = {
  label: string;
  value: string; // 'AAAA-MM-DD', ou '' se ainda não escolhida
  onChange: (value: string) => void;
  disabled?: boolean;
};

function toDate(value: string): Date {
  if (!value) {
    return new Date();
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplay(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function DateField({ label, value, onChange, disabled }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  // No iOS ("inline"), o "Concluído" só fecha o picker -- se o usuário não
  // tocar em nenhum dia diferente (ex: o padrão já abre em hoje, que é
  // frequentemente o valor desejado), o DateTimePicker nunca dispara
  // onChange, e o valor escolhido nunca era de fato salvo. Rastrear a data
  // mostrada localmente e commitar no "Concluído" resolve isso independente
  // de o usuário ter mexido no calendário ou não.
  const [pendingDate, setPendingDate] = useState(() => toDate(value));

  // @react-native-community/datetimepicker não tem implementação web -- o
  // <input type="date"> nativo do navegador já traz seletor de calendário
  // próprio, então caímos direto nele em vez de reimplementar um.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        {createElement('input', {
          type: 'date',
          value,
          disabled,
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
          style: styles.webInput,
        })}
      </View>
    );
  }

  function openPicker() {
    setPendingDate(toDate(value));
    setShowPicker(true);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TouchableOpacity style={[styles.input, styles.inputFlex]} onPress={openPicker} disabled={disabled}>
          <Text style={value ? styles.valueText : styles.placeholderText}>{value ? formatDisplay(value) : 'Selecionar data'}</Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} disabled={disabled} hitSlop={8} accessibilityLabel="Limpar data" accessibilityRole="button">
            <Ionicons name="close-circle" size={22} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {showPicker ? (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          // O picker nativo segue o tema do sistema: com o iPhone em modo
          // escuro ele desenha o calendário em branco, que some contra o
          // fundo claro da tela.
          themeVariant="light"
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              // O diálogo do Android já se fecha sozinho após a escolha (ou
              // cancelamento) -- aqui só existe onChange quando algo de fato
              // muda, então commitar direto é seguro.
              setShowPicker(false);
              if (event.type === 'set' && selectedDate) {
                onChange(toDateString(selectedDate));
              }
              return;
            }

            // iOS ("inline"): fica visível até "Concluído" -- só atualiza o
            // estado local aqui, o commit real acontece lá embaixo.
            if (selectedDate) {
              setPendingDate(selectedDate);
            }
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && showPicker ? (
        <TouchableOpacity
          onPress={() => {
            onChange(toDateString(pendingDate));
            setShowPicker(false);
          }}
          style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Concluído</Text>
        </TouchableOpacity>
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
    // Estes viram atributos CSS de verdade num <input> cru (não passam pelo
    // resolvedor de estilo do react-native-web como View/TextInput), então
    // precisam do que o CSS exige explicitamente -- sem borderStyle, o
    // navegador ignora borderWidth/borderColor (o padrão é "sem borda").
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
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  doneButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
});
