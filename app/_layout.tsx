import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
        {/* Acionada pelo "+" da Home. Fica na pilha raiz, e nao dentro da
            aba Grupos, para nao empilhar em cima do que estiver aberto la
            -- quando morava em app/(app)/groups/ ela herdava aquela pilha
            e o modal abria mostrando a ultima tela de pedal por baixo. */}
        <Stack.Screen
          name="new-event"
          options={{ title: 'Novo pedal', presentation: 'modal', headerShown: true }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
