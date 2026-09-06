// Pub-sub mínimo para o _layout das Tabs avisar a tela Home quando o usuário
// toca na aba "Início" já estando nela -- tabPress nesse caso não dispara
// useFocusEffect (não houve mudança de foco), então não há outro jeito de
// notificar a tela sem alguma forma de comunicação entre o navigator e a
// screen.
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeHomeRefresh(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerHomeRefresh() {
  listeners.forEach((listener) => listener());
}
