import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';

// Mesmo motivo de groups/_layout.tsx: um reload direto em /profile/settings
// precisa ter o index por baixo para o botão de voltar funcionar.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function ProfileLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Perfil',
          // Ver o comentário equivalente em groups/_layout.tsx.
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile/settings')}
              hitSlop={8}
              style={{ marginRight: 12 }}
              accessibilityLabel="Configurações do perfil"
              accessibilityRole="button">
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
    </Stack>
  );
}
