import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../../components/Avatar';
import { LoadingView } from '../../../../components/LoadingView';
import { StatusText } from '../../../../components/StatusText';
import { colors } from '../../../../constants/colors';
import { useGroup } from '../../../../hooks/useGroup';
import { JoinRequestRow, useJoinRequests } from '../../../../hooks/useJoinRequests';

// "agora", "há 5 min", "há 3 h", "há 2 dias" -- e a data a partir de uma
// semana, quando "há 23 dias" já diz menos que o dia em si.
function requestedAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) {
    return 'agora';
  }
  if (minutes < 60) {
    return `há ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `há ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  }
  const date = new Date(iso);
  return `em ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

type RequestItemProps = {
  request: JoinRequestRow;
  responding: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
};

// Mesmo formato de linha da lista de membros (MemberRow): foto e texto à
// esquerda, ações compactas à direita.
function RequestItem({ request, responding, disabled, onApprove, onReject }: RequestItemProps) {
  const name = request.users?.name ?? 'Usuário';

  return (
    <View style={styles.row}>
      <Avatar photo={request.users?.profile_photo_url ?? null} name={name} size={44} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta}>Pediu para entrar {requestedAgo(request.created_at)}</Text>
      </View>

      {responding ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, styles.reject]}
            onPress={onReject}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Recusar ${name}`}>
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, styles.approve]}
            onPress={onApprove}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Aprovar ${name}`}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function GroupJoinRequests() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const { membership, loading: groupLoading } = useGroup(groupId);
  const { requests, loading, error, respond, respondingId, respondError } = useJoinRequests(groupId);

  if (groupLoading || loading) {
    return <LoadingView />;
  }

  if (membership?.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <StatusText variant="error">Você não pode ver as solicitações deste grupo.</StatusText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {respondError ? (
        <View style={styles.errorBanner}>
          <StatusText variant="error">{respondError}</StatusText>
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            requests.length > 0 ? (
              <Text style={styles.header}>
                {requests.length === 1
                  ? '1 pessoa quer entrar no grupo'
                  : `${requests.length} pessoas querem entrar no grupo`}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <RequestItem
              request={item}
              responding={respondingId === item.id}
              // Uma resposta por vez: a lista recarrega ao fim de cada uma.
              disabled={respondingId !== null}
              onApprove={() => respond(item.id, true)}
              onReject={() => respond(item.id, false)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="mail-open-outline" size={26} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma solicitação pendente</Text>
              <Text style={styles.emptyHint}>Quando alguém pedir para entrar, o pedido aparece aqui.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexGrow: 1,
  },
  header: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    paddingBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  errorBanner: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  meta: {
    fontSize: 13,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reject: {
    backgroundColor: '#f1f2f4',
  },
  approve: {
    backgroundColor: colors.primary,
  },
  // Mesma largura dos dois botões, para a linha não "pular" ao responder.
  spinner: {
    width: 84,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf1fe',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyHint: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
});
