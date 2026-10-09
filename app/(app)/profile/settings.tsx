import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useProfile } from '../../../hooks/useProfile';
import { supabase } from '../../../lib/supabase';

export default function ProfileSettings() {
  const { profile, loading, error, save, updatePhoto } = useProfile();
  const { pickImage, picking, error: pickError } = useImageUpload();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
    }
  }, [profile?.name]);

  async function handleSave() {
    if (saving || name.trim().length === 0) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const ok = await save({ name: name.trim() });

    setSaving(false);
    setSaveSuccess(ok);
    if (!ok) {
      setSaveError('Não foi possível salvar suas alterações. Tente novamente.');
    }
  }

  async function handleChangePhoto() {
    if (picking || uploadingPhoto) {
      return;
    }
    setPhotoError(null);

    const image = await pickImage();
    if (!image) {
      return;
    }

    setUploadingPhoto(true);
    const updateError = await updatePhoto(image);
    setUploadingPhoto(false);
    setPhotoError(updateError);
  }

  async function handleSignOut() {
    setSignOutError(null);
    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      setSignOutError(signOutErr.message);
    }
    // Em caso de sucesso, o listener onAuthStateChange do AuthContext recebe SIGNED_OUT
    // e o roteamento do layout raiz redireciona para o grupo não autenticado.
  }

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? 'Não foi possível carregar seu perfil. Tente novamente.'}</Text>
      </View>
    );
  }

  const photoBusy = picking || uploadingPhoto;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity
        style={styles.photoButton}
        onPress={handleChangePhoto}
        disabled={photoBusy}
        accessibilityLabel="Alterar foto de perfil"
        accessibilityRole="button">
        <View>
          <Avatar photo={profile.profile_photo_url} name={profile.name} size={96} />
          {photoBusy ? (
            <View style={styles.photoOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </View>
        <Text style={styles.photoLabel}>Alterar foto</Text>
      </TouchableOpacity>

      {photoError ?? pickError ? <Text style={styles.error}>{photoError ?? pickError}</Text> : null}

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setSaveSuccess(false);
        }}
        placeholder="Nome"
        editable={!saving}
      />

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      {saveSuccess ? <Text style={styles.success}>Alterações de perfil salvas!</Text> : null}

      <TouchableOpacity
        style={[styles.button, (saving || name.trim().length === 0) && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving || name.trim().length === 0}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
      </TouchableOpacity>

      {signOutError ? <Text style={styles.error}>{signOutError}</Text> : null}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  photoButton: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: {
    color: '#2f6feb',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#c0392b',
  },
  success: {
    color: '#2a8a4a',
  },
  button: {
    backgroundColor: '#2f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  signOutButtonText: {
    color: '#c0392b',
    fontSize: 16,
    fontWeight: '600',
  },
});
