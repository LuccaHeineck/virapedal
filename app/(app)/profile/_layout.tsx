import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../constants/theme';

// Mesmo motivo de groups/_layout.tsx: um reload direto em /profile/settings
// precisa ter o index por baixo para o botão de voltar funcionar.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function ProfileLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      {/* O perfil desenha o próprio título e o botão de Configurações. */}
      <Stack.Screen name="index" options={{ title: 'Perfil', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
    </Stack>
  );
}
