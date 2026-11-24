import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../constants/theme';

// Mesmo motivo do groups/_layout: um reload monta a tela aninhada sem o
// index, deixando o "voltar" sem destino -- fixar o initialRouteName resolve.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RoutesLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      {/* A lista desenha o próprio título, como no design. "Iniciar rota"
          mora no "Gravar" da barra inferior. */}
      <Stack.Screen name="index" options={{ title: 'Atividade', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Iniciar rota', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Rota' }} />
    </Stack>
  );
}
