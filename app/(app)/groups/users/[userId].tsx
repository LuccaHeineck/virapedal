import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../../constants/colors';
import { supabase } from '../../../../lib/supabase';

type PublicProfile = {
  id: string;
  name: string;
  profile_photo_url: string | null;
};

export default function UserProfile() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
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

      const { data, error: queryError } = await supabase
        .from('users')
        .select('id, name, profile_photo_url')
        .eq('id', userId)
        .maybeSingle<PublicProfile>();

      if (!active) return;

      if (queryError || !data) {
        setError('Perfil indisponível.');
      } else {
        setProfile(data);
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
      <Stack.Screen options={{ title: profile?.name ?? 'Perfil' }} />
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
