import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { palette } from '../constants/colors';
import { fonts } from '../constants/theme';

type TabItem = {
  // Nome da rota em app/(app)/_layout.tsx.
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// Ordem do design: Grupos · Pedais · Gravar · Atividade · Perfil. É a ordem
// de exibição só: a das Tabs.Screen continua com "index" primeiro, para que
// ele siga sendo a aba inicial.
const LEFT: TabItem[] = [
  { name: 'groups', label: 'Grupos', icon: 'home-outline' },
  { name: 'index', label: 'Pedais', icon: 'calendar-outline' },
];
const RIGHT: TabItem[] = [
  { name: 'routes', label: 'Atividade', icon: 'trending-up-outline' },
  { name: 'profile', label: 'Perfil', icon: 'person-outline' },
];

const NAV_HEIGHT = 76;

// Barra de 5 colunas iguais (grid, não space-around -- era isso que
// desalinhava os itens). "Gravar" é um item como os outros, sem FAB nem
// sombra, e abre o início de gravação de qualquer aba.
export function BottomNav({ state, navigation, insets }: BottomTabBarProps) {
  const router = useRouter();
  const focused = state.routes[state.index];

  // Só nas raízes das abas: em detalhe de grupo/pedal, criação de grupo e na
  // gravação a tela do topo da pilha aninhada não é a "index". Decide pelo
  // nome e não pela profundidade: um replace para a lista deixa a pilha como
  // [index, index], e a lista apareceria sem a barra. Estado parcial (pilha
  // ainda não montada) pode vir sem index -- aí a do topo é a última.
  const nested = focused.state;
  const nestedTop = nested ? nested.routes[nested.index ?? nested.routes.length - 1] : undefined;
  if (nestedTop && nestedTop.name !== 'index') {
    return null;
  }

  function renderTab(item: TabItem) {
    const route = state.routes.find((r) => r.name === item.name);
    if (!route) {
      return <View key={item.name} style={styles.item} />;
    }
    const isFocused = focused.key === route.key;
    const color = isFocused ? palette.primary : palette.inkInactive;

    function onPress() {
      // Dispara o tabPress para que os listeners de cada aba (reset da pilha,
      // refresh do Início) continuem valendo.
      const event = navigation.emit({ type: 'tabPress', target: route!.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route!.name, route!.params);
      }
    }

    return (
      <TouchableOpacity
        key={item.name}
        style={styles.item}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={item.label}>
        <Ionicons name={item.icon} size={21} color={color} style={styles.icon} />
        <Text style={[styles.label, { color }]}>{item.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.bar, { height: NAV_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {LEFT.map(renderTab)}

      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push('/routes/new')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Gravar rota">
        <View style={styles.recordDot}>
          <View style={styles.recordCore} />
        </View>
        <Text style={[styles.label, styles.recordLabel]}>Gravar</Text>
      </TouchableOpacity>

      {RIGHT.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 14,
    paddingHorizontal: 8,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  // flex:1 em todas as colunas faz o papel do repeat(5, 1fr) do design.
  item: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
  },
  icon: {
    width: 21,
    height: 21,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    lineHeight: 11,
  },
  recordDot: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.onPrimary,
  },
  recordLabel: {
    fontFamily: fonts.bodyBold,
    color: palette.primaryInk,
  },
});
