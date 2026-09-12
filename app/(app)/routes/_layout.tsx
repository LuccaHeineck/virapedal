import { Stack } from 'expo-router';

// Mesmo motivo do groups/_layout: um reload monta a tela aninhada sem o
// index, deixando o "voltar" sem destino -- fixar o initialRouteName resolve.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RoutesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Rotas',
          // "index" é sempre a raiz desta aba -- o initialRouteName acima às
          // vezes sintetiza histórico residual que faz o header mostrar um
          // botão de voltar aqui indevidamente (mesma limitação do
          // groups/_layout no React Native Web). "Iniciar rota" mora no FAB
          // da lista, não no header.
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name="new" options={{ title: 'Iniciar rota', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Rota' }} />
    </Stack>
  );
}
