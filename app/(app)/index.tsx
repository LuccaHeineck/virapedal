import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EventRow } from '../../components/EventRow';
import { LoadingView } from '../../components/LoadingView';
import { PedalSearch } from '../../components/PedalSearch';
import { StatusText } from '../../components/StatusText';
import { UserSearch } from '../../components/UserSearch';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents';
import { subscribeHomeRefresh } from '../../lib/homeRefreshEmitter';

export default function Home() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSection, setSearchSection] = useState<'users' | 'events'>('users');
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;

  const { events, loading, error, refresh } = useUpcomingEvents();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Cobre o caso de tocar em "Início" já estando nela, que não muda o foco
  // e por isso não dispara o useFocusEffect acima.
  useEffect(() => subscribeHomeRefresh(refresh), [refresh]);

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: () =>
            searchOpen ? null : (
              <TouchableOpacity
                style={[styles.headerAction, styles.navigationAction]}
                onPress={() => setSearchOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Pesquisar pessoas e pedais"
                hitSlop={8}
              >
                <Ionicons name="search-outline" size={25} color={colors.primary} />
              </TouchableOpacity>
            ),
        }}
      />
      <View style={styles.container}>
        {searchOpen ? (
          <View style={styles.headerRow}>
            <Text style={[styles.title, styles.searchTitle]}>Pesquisar no Virapedal</Text>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => setSearchOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Fechar busca"
              hitSlop={8}
            >
              <Ionicons name="close" size={25} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.title} numberOfLines={1}>
            {name ? `Olá, ${name}` : 'Bem-vindo ao Virapedal'}
          </Text>
        )}

      {searchOpen ? (
        <>
          <View style={styles.searchSections}>
            <TouchableOpacity
              style={[styles.searchSection, searchSection === 'users' && styles.searchSectionActive]}
              onPress={() => setSearchSection('users')}
              accessibilityRole="button"
              accessibilityState={{ selected: searchSection === 'users' }}
            >
              <Text style={[styles.searchSectionText, searchSection === 'users' && styles.searchSectionTextActive]}>Pessoas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchSection, searchSection === 'events' && styles.searchSectionActive]}
              onPress={() => setSearchSection('events')}
              accessibilityRole="button"
              accessibilityState={{ selected: searchSection === 'events' }}
            >
              <Text style={[styles.searchSectionText, searchSection === 'events' && styles.searchSectionTextActive]}>Pedais</Text>
            </TouchableOpacity>
          </View>
          {searchSection === 'users' ? (
            <UserSearch
              onSelectUser={(userId) =>
                router.push({
                  pathname: '/groups/users/[userId]',
                  params: { userId, from: 'home-search' },
                })
              }
            />
          ) : (
            <PedalSearch onSelectPedal={(groupId, eventId) => router.push(`/groups/${groupId}/events/${eventId}?from=home`)} />
          )}
        </>
      ) : (
        <>
          {loading ? (
            <LoadingView />
          ) : error ? (
            <View style={styles.centered}>
              <StatusText variant="error">{error}</StatusText>
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={events}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <Link href={`/groups/${item.group_id}/events/${item.id}?from=home`} asChild>
                  <TouchableOpacity>
                    <EventRow
                      title={item.title}
                      status={item.status}
                      eventDate={item.event_date}
                      startTime={item.start_time}
                      meetingPoint={item.meeting_point}
                      groupName={item.group_name}
                      groupImagePath={item.group_image_url}
                      isParticipant={item.is_participant}
                    />
                  </TouchableOpacity>
                </Link>
              )}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>Nenhum pedal agendado nos seus grupos.</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/groups/new-event')}
            accessibilityLabel="Criar pedal"
            accessibilityRole="button">
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchTitle: {
    flex: 1,
  },
  searchSections: {
    flexDirection: 'row',
    gap: 8,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.placeholder,
  },
  searchSectionActive: {
    backgroundColor: colors.primary,
  },
  searchSectionText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  searchSectionTextActive: {
    color: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationAction: {
    marginRight: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
