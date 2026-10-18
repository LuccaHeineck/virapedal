import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export type TrackingPermission = 'ok' | 'services-off' | 'denied-foreground' | 'denied-background';

export const TRACKING_PERMISSION_MESSAGES: Record<Exclude<TrackingPermission, 'ok'>, string> = {
  'services-off': 'A localização do celular está desligada. Ative-a para gravar a rota.',
  'denied-foreground':
    'Sem acesso à localização não dá para gravar o trajeto. Libere a localização do Virapedal nas configurações.',
  'denied-background':
    'Para gravar com a tela bloqueada, escolha "Permitir o tempo todo" na localização do Virapedal.',
};

// O Android 11+ não mostra um diálogo para "o tempo todo": manda a pessoa
// para a tela de ajustes. Sem um aviso antes, isso parece um bug do app.
function explainBackground(): Promise<boolean> {
  const message =
    'Num pedal o celular fica no bolso com a tela apagada. Para o trajeto continuar sendo gravado, ' +
    'escolha "Permitir o tempo todo" na próxima tela.';

  return new Promise((resolve) => {
    Alert.alert('Gravar com a tela bloqueada', message, [
      { text: 'Agora não', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continuar', onPress: () => resolve(true) },
    ]);
  });
}

// Chamado antes de criar ou retomar uma rota: sem localização a rota nasceria
// sem traçado, que é exatamente o que esta etapa veio resolver.
export async function ensureTrackingPermission(): Promise<TrackingPermission> {
  if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) {
    return 'services-off';
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    return 'denied-foreground';
  }

  // Na web não existe segundo plano: a gravação vive enquanto a aba estiver
  // aberta.
  if (Platform.OS === 'web') {
    return 'ok';
  }

  const current = await Location.getBackgroundPermissionsAsync();
  if (current.granted) {
    return 'ok';
  }
  if (!current.canAskAgain || !(await explainBackground())) {
    return 'denied-background';
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.granted ? 'ok' : 'denied-background';
}
