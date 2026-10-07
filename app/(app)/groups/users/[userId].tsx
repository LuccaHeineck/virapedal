import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);
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

      let foundProfile = queryError ? null : visibleProfile;
      if (!foundProfile) {
        // A leitura direta cobre colegas de grupo; a função expõe apenas os
        // dados públicos dos demais usuários encontrados pela busca.
        const { data: publicProfiles, error: publicError } = await supabase.rpc('get_public_user_profile', {
          p_user_id: userId,
        });
        if (!active) return;
        if (!publicError && Array.isArray(publicProfiles)) {
          foundProfile = (publicProfiles[0] as PublicProfile | undefined) ?? null;
        }
      }

      if (!foundProfile) {
        setError('Perfil indisponível.');
      } else {
        setProfile(foundProfile);
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
          title: profile?.name ?? 'Perfil',
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
        ) : profile ? (
          <>
            {profile.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initial}>{profile.name.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
            <Text style={styles.name}>{profile.name}</Text>
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
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  initial: { color: '#fff', fontSize: 36, fontWeight: '600' },
  name: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  message: { fontSize: 16, color: '#666', textAlign: 'center' },
});
