import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { LoadingView } from '../../../../components/LoadingView';
import { MemberRow } from '../../../../components/MemberRow';
import { StatusText } from '../../../../components/StatusText';
import { colors } from '../../../../constants/colors';
import { useGroup } from '../../../../hooks/useGroup';
import { useGroupMembers } from '../../../../hooks/useGroupMembers';

export default function GroupMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const { membership } = useGroup(groupId);
  const { members, loading, error, removeMember, changeRole, mutationError } = useGroupMembers(groupId);

  const isAdmin = membership?.role === 'admin';

  if (loading) {
    return <LoadingView />;
  }

  return (
    <View style={styles.container}>
      {mutationError ? (
        <View style={styles.errorBanner}>
          <StatusText variant="error">{mutationError}</StatusText>
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}>
          <StatusText variant="error">{error}</StatusText>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              isViewerAdmin={isAdmin}
              onToggleRole={() => changeRole(item.id, item.role === 'admin' ? 'member' : 'admin')}
              onRemove={() => removeMember(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhum membro encontrado.</Text>
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
});
