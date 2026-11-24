import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../constants/theme';

// um reload monta a tela sozinha sem o index, ai nao tinha pra onde voltar, agora tem
export const unstable_settings = {
  initialRouteName: 'index',
}

export default function GroupsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      {/* A lista desenha o próprio cabeçalho (título, "+" e perfil), como no
          design. Sem o header nativo também some o "voltar" residual que o
          initialRouteName acima às vezes sintetizava aqui. */}
      <Stack.Screen name="index" options={{ title: 'Grupos', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Novo grupo', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Grupo' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar grupo' }} />
      <Stack.Screen name="[id]/members" options={{ title: 'Membros' }} />
      <Stack.Screen name="[id]/requests" options={{ title: 'Solicitações' }} />
      <Stack.Screen name="[id]/events/index" options={{ title: 'Pedais' }} />
      <Stack.Screen name="[id]/events/new" options={{ title: 'Novo pedal', presentation: 'modal' }} />
      <Stack.Screen name="[id]/events/[eventId]/index" options={{ title: 'Pedal' }} />
      <Stack.Screen name="[id]/events/[eventId]/edit" options={{ title: 'Editar pedal' }} />
      <Stack.Screen name="users/[userId]" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
