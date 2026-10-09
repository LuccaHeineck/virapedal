import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useProfile } from '../../../hooks/useProfile';
import { supabase } from '../../../lib/supabase';

type Confirmation = 'removePhoto' | 'signOut' | null;

export default function ProfileSettings() {
  const { user } = useAuth();
  const { profile, loading, error, save, updatePhoto, removePhoto } = useProfile();
  const { pickImage, picking, error: pickError } = useImageUpload();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
    }
  }, [profile?.name]);

  // Só há o que salvar quando o nome mudou de fato (e não ficou vazio).
  const trimmedName = name.trim();
  const canSave = !!profile && trimmedName.length > 0 && trimmedName !== profile.name;

  async function handleSave() {
    if (saving || !canSave) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const ok = await save({ name: trimmedName });

    setSaving(false);
    setSaveSuccess(ok);
    if (!ok) {
      setSaveError('Não foi possível salvar suas alterações. Tente novamente.');
    }
  }

  async function handleChangePhoto() {
    if (picking || uploadingPhoto || removingPhoto) {
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

  async function handleRemovePhoto() {
    setPhotoError(null);
    setRemovingPhoto(true);
    const removeError = await removePhoto();
    setRemovingPhoto(false);
    setConfirmation(null);
    setPhotoError(removeError);
  }

  async function handleSignOut() {
    setSignOutError(null);
    setSigningOut(true);
    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      setSigningOut(false);
      setConfirmation(null);
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
        <StatusText variant="error">{error ?? 'Não foi possível carregar seu perfil. Tente novamente.'}</StatusText>
      </View>
    );
  }

  const photoBusy = picking || uploadingPhoto || removingPhoto;
  const visiblePhotoError = photoError ?? pickError;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.photoSection}>
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={photoBusy}
            accessibilityLabel="Alterar foto de perfil"
            accessibilityRole="button">
            <Avatar photo={profile.profile_photo_url} name={profile.name} size={96} />
            {photoBusy ? (
              <View style={styles.photoOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.photoActions}>
            <TouchableOpacity onPress={handleChangePhoto} disabled={photoBusy} hitSlop={8}>
              <Text style={[styles.photoAction, photoBusy && styles.photoActionDisabled]}>Alterar foto</Text>
            </TouchableOpacity>
            {profile.profile_photo_url ? (
              <TouchableOpacity onPress={() => setConfirmation('removePhoto')} disabled={photoBusy} hitSlop={8}>
                <Text style={[styles.photoAction, styles.photoActionDestructive, photoBusy && styles.photoActionDisabled]}>
                  Remover foto
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {visiblePhotoError ? <StatusText variant="error">{visiblePhotoError}</StatusText> : null}

        <TextField
          label="Nome"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setSaveSuccess(false);
          }}
          placeholder="Nome"
          editable={!saving}
        />

        {user?.email ? (
          <TextField
            label="E-mail"
            value={user.email}
            editable={false}
            style={styles.readOnlyInput}
            accessibilityHint="O e-mail da conta não pode ser alterado aqui."
          />
        ) : null}

        {saveError ? <StatusText variant="error">{saveError}</StatusText> : null}
        {saveSuccess ? <StatusText variant="success">Alterações de perfil salvas!</StatusText> : null}

        <View style={styles.saveButton}>
          <Button title="Salvar" onPress={handleSave} loading={saving} disabled={!canSave} />
        </View>

        {/* Sair fica isolado no fim da tela, longe das ações de edição. */}
        <View style={styles.accountSection}>
          {signOutError ? <StatusText variant="error">{signOutError}</StatusText> : null}
          <Button title="Sair" variant="destructive" onPress={() => setConfirmation('signOut')} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmation === 'removePhoto'}
        icon="image-outline"
        title="Remover foto?"
        message="Sua foto de perfil será removida e suas iniciais aparecerão no lugar."
        confirmLabel="Remover"
        onConfirm={handleRemovePhoto}
        onCancel={() => setConfirmation(null)}
        loading={removingPhoto}
      />

      <ConfirmDialog
        visible={confirmation === 'signOut'}
        icon="log-out-outline"
        title="Sair da conta?"
        message="Você será desconectado deste dispositivo e precisará entrar novamente para acessar sua conta."
        confirmLabel="Sair"
        onConfirm={handleSignOut}
        onCancel={() => setConfirmation(null)}
        loading={signingOut}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  photoSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 24,
  },
  photoAction: {
    color: colors.primary,
    fontWeight: '600',
  },
  photoActionDestructive: {
    color: colors.error,
  },
  photoActionDisabled: {
    opacity: 0.5,
  },
  readOnlyInput: {
    backgroundColor: colors.placeholder,
    color: '#666',
  },
  saveButton: {
    marginTop: 8,
  },
  // marginTop: 'auto' empurra "Sair" para o fim da tela quando sobra espaço.
  accountSection: {
    marginTop: 'auto',
    paddingTop: 32,
    gap: 8,
  },
});
