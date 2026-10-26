import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { palette } from '../constants/colors';
import { stackScreenOptions } from '../constants/theme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { flushQueue } from '../lib/routeTracking';
// Registra a task de GPS no carregamento do bundle -- ver lib/routeTracking/task.ts.
import '../lib/routeTracking/task';

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function RootNavigator() {
  const { session, loading: authLoading, passwordRecovery } = useAuth();
  // Sem as fontes a primeira tela pintaria com a do sistema e trocaria logo
  // depois. Um erro ao carregar não trava o app: segue com a fonte padrão.
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });
  const loading = authLoading || (!fontsLoaded && !fontError);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // Pontos que ficaram na fila (pedal sem sinal, app fechado antes de enviar)
  // sobem assim que houver sessão. Falha aqui não é erro: tentam de novo no
  // próximo lote ou na próxima abertura.
  useEffect(() => {
    if (session) {
      flushQueue().catch(() => undefined);
    }
  }, [session]);

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      <Stack.Protected guard={!!session && !passwordRecovery}>
        <Stack.Screen name="(app)" />
        {/* Acionada pelo "+" da Home. Fica na pilha raiz, e nao dentro da
            aba Grupos, para nao empilhar em cima do que estiver aberto la
            -- quando morava em app/(app)/groups/ ela herdava aquela pilha
            e o modal abria mostrando a ultima tela de pedal por baixo. */}
        <Stack.Screen
          name="new-event"
          options={{ ...stackScreenOptions, title: 'Novo pedal', presentation: 'modal', headerShown: true }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session || passwordRecovery}>
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
