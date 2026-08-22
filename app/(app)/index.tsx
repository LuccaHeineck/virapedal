import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name ? `Olá, ${name}` : 'Bem-vindo ao Virapedal'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
