import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

// um reload monta a tela sozinha sem o index, ai nao tinha pra onde voltar, agora tem
export const unstable_settings = {
  initialRouteName: 'index',
}

export default function GroupsLayout() {
  const router = useRouter();

  return (
    <Stack screenOptions={{ headerTintColor: '#2f6feb' }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Grupos',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/groups/new')}
              hitSlop={8}
              accessibilityLabel="Criar grupo"
              accessibilityRole="button">
              <Ionicons name="add" size={26} color="#2f6feb" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="new" options={{ title: 'Novo grupo', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Grupo' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar grupo' }} />
      <Stack.Screen name="[id]/members" options={{ title: 'Membros' }} />
      <Stack.Screen name="[id]/requests" options={{ title: 'Solicitações' }} />
      <Stack.Screen name="[id]/events/index" options={{ title: 'Pedais' }} />
      <Stack.Screen name="[id]/events/new" options={{ title: 'Novo pedal', presentation: 'modal' }} />
      <Stack.Screen name="[id]/events/[eventId]/index" options={{ title: 'Pedal' }} />
      <Stack.Screen name="[id]/events/[eventId]/edit" options={{ title: 'Editar pedal' }} />
    </Stack>
  );
}
