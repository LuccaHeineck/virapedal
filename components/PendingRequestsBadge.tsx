import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

// Âmbar de "aguardando" -- o mesmo da faixa "Solicitação enviada" na tela do
// grupo, para que pendência tenha uma cor só no app.
const PENDING_FG = '#a8681f';

type PendingRequestsBadgeProps = {
  count: number;
};

// Selo de solicitações de entrada pendentes. O mesmo desenho aparece no card
// da lista de grupos e no botão "Solicitações" da tela do grupo, para que se
// leia como a mesma informação nos dois lugares.
export function PendingRequestsBadge({ count }: PendingRequestsBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <View
      style={styles.badge}
      accessibilityLabel={`${count} ${count === 1 ? 'solicitação pendente' : 'solicitações pendentes'}`}>
      <Ionicons name="person-add" size={11} color={PENDING_FG} />
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f7ecdc',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: PENDING_FG,
  },
});
