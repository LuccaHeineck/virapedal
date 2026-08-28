import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../../components/Button';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../constants/colors';
import { useGroupMutations } from '../../../hooks/useGroupMutations';
import { PickedImage, useImageUpload } from '../../../hooks/useImageUpload';

export default function NewGroup() {
  const router = useRouter();
  const { createGroup, updateGroup, submitting, error } = useGroupMutations();
  const { pickImage, uploadGroupCover, picking, uploading, error: imageError } = useImageUpload();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const busy = submitting || picking || uploading;
  const canSubmit = name.trim().length > 0 && !busy;

  async function handlePickImage() {
    const image = await pickImage();
    if (image) {
      setPickedImage(image);
    }
  }

  async function handleCreate() {
    if (!canSubmit) {
      return;
    }
    setSaveError(null);

    const group = await createGroup({
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      privacy: isPrivate ? 'private' : 'public',
    });

    if (!group) {
      setSaveError(error);
      return;
    }

    if (pickedImage) {
      const uploaded = await uploadGroupCover(group.id, pickedImage);
      if (uploaded) {
        await updateGroup(group.id, { image_url: uploaded.path });
      }
      // Se o upload da imagem falhar, o grupo já foi criado com sucesso —
      // segue para a tela do grupo em vez de bloquear a criação por causa
      // de uma imagem opcional.
    }

    router.replace(`/groups/${group.id}`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
        {pickedImage ? (
          <Image source={{ uri: pickedImage.uri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Escolher imagem</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextField label="Nome" value={name} onChangeText={setName} placeholder="Nome do grupo" editable={!busy} />
      <TextField
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        placeholder="Descrição (opcional)"
        multiline
        numberOfLines={3}
        editable={!busy}
      />

      <View style={styles.privacyRow}>
        <View>
          <Text style={styles.privacyLabel}>Grupo privado</Text>
          <Text style={styles.privacyHint}>
            {isPrivate ? 'Entrada mediante aprovação de um admin.' : 'Qualquer pessoa pode entrar diretamente.'}
          </Text>
        </View>
        <Switch value={isPrivate} onValueChange={setIsPrivate} disabled={busy} />
      </View>

      {imageError ? <StatusText variant="error">{imageError}</StatusText> : null}
      {saveError ? <StatusText variant="error">{saveError}</StatusText> : null}

      <Button title="Criar grupo" onPress={handleCreate} disabled={!canSubmit} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  imagePicker: {
    alignSelf: 'center',
  },
  imagePreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.placeholder,
  },
  imagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyHint: {
    fontSize: 13,
    color: '#666',
    maxWidth: 240,
  },
});
