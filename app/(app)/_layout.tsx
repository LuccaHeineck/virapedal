import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

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
        // Um link para um pedal aberto a partir da aba Início empurra aquela
        // tela para dentro da pilha desta aba (a rota mora em
        // app/(app)/groups/...). Sem isto, tocar no botão "Grupos" só troca
        // de aba mostrando o que ficou no topo dessa pilha -- o pedal, não a
        // lista de grupos. Forçar o destino para "index" a cada toque
        // garante que este botão sempre volte à lista de grupos.
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('groups', { screen: 'index' });
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