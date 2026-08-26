import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function CreateEventScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [routeDescription, setRouteDescription] = useState('');

  const handleCreateEvent = async () => {
    if (!title || !eventDate || !startTime || !meetingPoint) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios!');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('events').insert([
        {
          title,
          description,
          event_date: eventDate,
          start_time: startTime,
          meeting_point: meetingPoint,
          route_description: routeDescription,
          created_by: user.id,
          status: 'scheduled',
        },
      ]);

      if (error) {
        Alert.alert('Erro ao criar evento', error.message);
      } else {
        Alert.alert('Sucesso', 'Evento de pedal criado com sucesso!');
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Criar Novo Pedal</Text>

      <Text style={styles.label}>Título do Pedal *</Text>
      <TextInput style={styles.input} placeholder="Ex: Pedal Noturno Estrela" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Data (AAAA-MM-DD) *</Text>
      <TextInput style={styles.input} placeholder="2026-09-10" value={eventDate} onChangeText={setEventDate} />

      <Text style={styles.label}>Horário de Saída *</Text>
      <TextInput style={styles.input} placeholder="19:00" value={startTime} onChangeText={setStartTime} />

      <Text style={styles.label}>Ponto de Encontro *</Text>
      <TextInput style={styles.input} placeholder="Ex: Praça Menna Barreto" value={meetingPoint} onChangeText={setMeetingPoint} />

      <Text style={styles.label}>Descrição da Rota</Text>
      <TextInput style={styles.input} placeholder="Ex: 25km asfalto e chão de terra" value={routeDescription} onChangeText={setRouteDescription} />

      <Text style={styles.label}>Observações</Text>
      <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={3} placeholder="Trazer iluminação e capacete" value={description} onChangeText={setDescription} />

      <TouchableOpacity style={styles.button} onPress={handleCreateEvent} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Salvando...' : 'Cadastrar Pedal'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#2563eb', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});