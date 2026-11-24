import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EventRow } from '../../components/EventRow';
import { LoadingView } from '../../components/LoadingView';
import { PedalSearch } from '../../components/PedalSearch';
import { IconButton, ScreenHeader } from '../../components/ScreenHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { StatusText } from '../../components/StatusText';
import { UserSearch } from '../../components/UserSearch';
import { colors } from '../../constants/colors';
import { SCREEN_GUTTER, type } from '../../constants/theme';
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents';
import { subscribeHomeRefresh } from '../../lib/homeRefreshEmitter';

type SearchSection = 'users' | 'events';

const SEARCH_SECTIONS: { key: SearchSection; label: string }[] = [
  { key: 'users', label: 'Pessoas' },
  { key: 'events', label: 'Pedais' },
];

// Aba "Pedais": tudo que está agendado nos grupos do usuário.
export default function Home() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSection, setSearchSection] = useState<SearchSection>('users');

  const { events, loading, error, refresh } = useUpcomingEvents();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Cobre o caso de tocar em "Pedais" já estando nela, que não muda o foco
  // e por isso não dispara o useFocusEffect acima.
  useEffect(() => subscribeHomeRefresh(refresh), [refresh]);

  if (searchOpen) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Pesquisar"
          actions={<IconButton icon="close" onPress={() => setSearchOpen(false)} accessibilityLabel="Fechar busca" />}
        />
        <View style={styles.searchBody}>
          <SegmentedControl options={SEARCH_SECTIONS} active={searchSection} onChange={setSearchSection} />
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
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Pedais"
        subtitle="Tudo que está agendado nos seus grupos."
        actions={
          <>
            <IconButton icon="search" onPress={() => setSearchOpen(true)} accessibilityLabel="Pesquisar pessoas e pedais" />
            <IconButton icon="add" onPress={() => router.push('/new-event')} accessibilityLabel="Criar pedal" />
          </>
        }
      />

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
          ListHeaderComponent={events.length > 0 ? <Text style={[type.sectionLabel, styles.section]}>Próximos</Text> : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Link href={`/groups/${item.group_id}/events/${item.id}?from=home`} asChild>
              <TouchableOpacity activeOpacity={0.8}>
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
              <Text style={type.empty}>Nenhum pedal agendado. Entre em um grupo ou crie um pedal para começar.</Text>
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
  searchBody: {
    flex: 1,
    paddingHorizontal: SCREEN_GUTTER,
    gap: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 10,
  },
  separator: {
    height: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
