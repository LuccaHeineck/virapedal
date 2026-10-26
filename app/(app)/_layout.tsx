import { Tabs } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { palette } from '../../constants/colors';
import { triggerHomeRefresh } from '../../lib/homeRefreshEmitter';

// Ícones, rótulos e a ordem de exibição das abas moram no BottomNav. Todas
// as abas desenham o próprio título dentro da tela, como no design.
export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.bg } }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Pedais' }}
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
        options={{ title: 'Grupos' }}
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
        name="routes"
        options={{ title: 'Atividade' }}
        // Mesmo tratamento da aba "Grupos": um link para uma rota aberto a
        // partir de outra aba empurra aquela tela para dentro da pilha desta
        // aba. Resetar o estado da pilha aninhada diretamente troca para
        // "Rotas" já mostrando só a lista, sem flash da tela residual.
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();

            const routesRoute = navigation
              .getState()
              .routes.find((route: { name: string }) => route.name === 'routes');

            if (routesRoute?.state && routesRoute.state.index !== 0) {
              navigation.dispatch({
                type: 'RESET',
                payload: { index: 0, routes: [{ name: 'index' }] },
                target: routesRoute.state.key,
              });
            } else {
              navigation.navigate('routes', { screen: 'index' });
            }
          },
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil' }}
        // Mesmo tratamento das abas "Grupos" e "Rotas": tocar em "Perfil"
        // estando em Configurações volta para o perfil.
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();

            const profileRoute = navigation
              .getState()
              .routes.find((route: { name: string }) => route.name === 'profile');

            if (profileRoute?.state && profileRoute.state.index !== 0) {
              navigation.dispatch({
                type: 'RESET',
                payload: { index: 0, routes: [{ name: 'index' }] },
                target: profileRoute.state.key,
              });
            } else {
              navigation.navigate('profile', { screen: 'index' });
            }
          },
        })}
      />
    </Tabs>
  );
}