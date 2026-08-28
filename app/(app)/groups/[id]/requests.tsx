import { useLocalSearchParams } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../components/Button';
import { LoadingView } from '../../../../components/LoadingView';
import { StatusText } from '../../../../components/StatusText';
import { colors } from '../../../../constants/colors';
import { useGroup } from '../../../../hooks/useGroup';
import { useJoinRequests } from '../../../../hooks/useJoinRequests';

export default function GroupJoinRequests() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const { membership, loading: groupLoading } = useGroup(groupId);
  const { requests, loading, error, respond, respondError } = useJoinRequests(groupId);

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
          renderItem={({ item }) => {
            const name = item.users?.name ?? 'Usuário';
            const photoUrl = item.users?.profile_photo_url ?? null;
            return (
              <View style={styles.row}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>{name.charAt(0).toUpperCase() || '?'}</Text>
                  </View>
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.actions}>
                  <Button title="Aprovar" onPress={() => respond(item.id, true)} />
                  <Button title="Rejeitar" variant="destructive" onPress={() => respond(item.id, false)} />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhuma solicitação pendente.</Text>
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
  emptyText: {
    color: '#888',
    fontSize: 15,
  },
  row: {
    gap: 8,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.placeholder,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontWeight: '600',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
