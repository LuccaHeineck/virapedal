import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EventsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Próximos Pedais</Text>

      <TouchableOpacity 
        style={styles.fabButton} 
        onPress={() => router.push('/create-event')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={22} color="#fff" style={styles.icon} />
        <Text style={styles.fabText}>Criar Pedal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    marginRight: 6,
  },
  fabText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});