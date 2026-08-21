import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from './lib/supabase';

export default function App() {
  const [status, setStatus] = useState('Checking Supabase connection...');

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      setStatus(error ? `Supabase error: ${error.message}` : 'Supabase connected ✅');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text>Virapedal</Text>
      <Text>{status}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
