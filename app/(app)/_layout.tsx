import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { triggerHomeRefresh } from '../../lib/homeRefreshEmitter';

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
        // useFocusEffect não dispara ao tocar numa aba já focada (sem
        // mudança de foco, sem novo evento) -- por isso o toque em "Início"
        // estando nela não recarregava nada. Avisa a tela via um pub-sub
        // simples só quando a aba já está ativa (senão navegar até ela via
        // outra aba já dispararia o refresh normal pelo useFocusEffect).
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (navigation.isFocused()) {
              triggerHomeRefresh();
            }
          },
        })}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          // A pilha aninhada em app/(app)/groups/_layout.tsx tem seu próprio
          // cabeçalho por tela — sem isso, o cabeçalho das Tabs (deste nível)
          // aparece empilhado em cima do dela.
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={size} />
          ),
        }}
        // Um link para um pedal ou "Novo pedal" aberto a partir de outra aba
        // empurra aquela tela para dentro da pilha desta aba (as rotas
        // moram em app/(app)/groups/...). navigation.navigate('groups',
        // {screen:'index'}) já resolvia o caso de ficar preso nela, mas
        // ainda deixava a tela residual "piscar" na troca de aba antes de
        // navegar pra index. Resetar o estado da pilha aninhada diretamente
        // (RESET com target no key dela) troca pra "Grupos" já mostrando
        // só a lista, sem esse flash.
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();

            const groupsRoute = navigation.getState().routes.find((route: { name: string }) => route.name === 'groups');

            if (groupsRoute?.state && groupsRoute.state.index !== 0) {
              navigation.dispatch({
                type: 'RESET',
                payload: { index: 0, routes: [{ name: 'index' }] },
                target: groupsRoute.state.key,
              });
            } else {
              navigation.navigate('groups', { screen: 'index' });
            }
          },
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}