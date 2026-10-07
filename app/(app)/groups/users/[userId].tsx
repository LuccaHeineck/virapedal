import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../../components/Avatar';
import { colors } from '../../../../constants/colors';
import { supabase } from '../../../../lib/supabase';

type PublicProfile = {
  id: string;
  name: string;
  profile_photo_url: string | null;
};

export default function UserProfile() {
  const { userId, from } = useLocalSearchParams<{ userId: string; from?: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayedProfile = profile?.id === userId ? profile : null;

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      setLocked(false);
      setProfile(null);

      if (!userId) {
        setError('Perfil indisponível.');
        setLoading(false);
        return;
      }

      const { data: visibleProfile, error: queryError } = await supabase
        .from('users')
        .select('id, name, profile_photo_url')
        .eq('id', userId)
        .maybeSingle<PublicProfile>();

      if (!active) return;

      if (queryError) {
        setError('Não foi possível carregar o perfil. Tente novamente.');
      } else if (!visibleProfile) {
        setLocked(true);
      } else {
        setProfile(visibleProfile);
      }
      setLoading(false);
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <>
      <Stack.Screen
        options={{
          title: displayedProfile?.name ?? 'Perfil',
          ...(from === 'home-search'
            ? {
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => router.replace('/')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar para a busca"
                  >
                    <Ionicons name="chevron-back" size={26} color={colors.primary} />
                  </TouchableOpacity>
                ),
              }
            : {}),
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : error ? (
          <Text style={styles.message}>{error}</Text>
        ) : locked ? (
          <>
            <Ionicons name="lock-closed-outline" size={64} color="#666" />
            <Text style={styles.message}>
              Você e esta pessoa precisam fazer parte do mesmo grupo para visualizar o perfil.
            </Text>
          </>
        ) : displayedProfile ? (
          <>
            <Avatar photo={displayedProfile.profile_photo_url} name={displayedProfile.name} size={96} />
            <Text style={styles.name}>{displayedProfile.name}</Text>
          </>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.background,
  },
  name: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  message: { fontSize: 16, color: '#666', textAlign: 'center' },
});
