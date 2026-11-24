import { View } from 'react-native';
import { Tag } from './Tag';

type PendingRequestsBadgeProps = {
  count: number;
};

// Selo de solicitações de entrada pendentes. O mesmo desenho aparece no card
// da lista de grupos e no botão "Solicitações" da tela do grupo, para que se
// leia como a mesma informação nos dois lugares. Âmbar = "aguardando".
export function PendingRequestsBadge({ count }: PendingRequestsBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <View accessibilityLabel={`${count} ${count === 1 ? 'solicitação pendente' : 'solicitações pendentes'}`}>
      <Tag label={String(count)} tone="amber" icon="person-add-outline" size="compact" />
    </View>
  );
}
