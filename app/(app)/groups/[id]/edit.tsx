import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../../../components/Button';
import { GroupImage } from '../../../../components/GroupImage';
import { LoadingView } from '../../../../components/LoadingView';
import { StatusText } from '../../../../components/StatusText';
import { TextField } from '../../../../components/TextField';
import { colors } from '../../../../constants/colors';
import { useGroup } from '../../../../hooks/useGroup';
import { useGroupMutations } from '../../../../hooks/useGroupMutations';
import { useImageUpload } from '../../../../hooks/useImageUpload';

export default function EditGroup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const router = useRouter();

  const { group, membership, loading: groupLoading, error: groupError } = useGroup(groupId);
  const { updateGroup, submitting, error: saveError } = useGroupMutations();
  const { pickImage, uploadGroupCover, picking, uploading, error: imageError } = useImageUpload();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? '');
      setIsPrivate(group.privacy === 'private');
    }
  }, [group]);

  if (groupLoading) {
    return <LoadingView />;
  }

  // A tela se esconde para não-admins como conveniência de UI — a
  // aplicação real da regra é o RLS, que rejeitaria o UPDATE de qualquer
  // forma caso a checagem abaixo fosse contornada.
  if (groupError || !group || membership?.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <StatusText variant="error">{groupError ?? 'Você não pode editar este grupo.'}</StatusText>
      </View>
    );
  }

  const busy = submitting || picking || uploading;
  const canSubmit = name.trim().length > 0 && !busy;

  async function handlePickImage() {
    const image = await pickImage();
    if (image) {
      setLocalImageUri(image.uri);
      const uploaded = await uploadGroupCover(groupId, image);
      if (uploaded) {
        await updateGroup(groupId, { image_url: uploaded.path });
      }
    }
  }

  async function handleSave() {
    if (!canSubmit) {
      return;
    }
    const updated = await updateGroup(groupId, {
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      privacy: isPrivate ? 'private' : 'public',
    });
    if (updated) {
      router.back();
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
        {localImageUri ? (
          <Image source={{ uri: localImageUri }} style={styles.imagePreview} />
        ) : (
          <GroupImage key={group.updated_at} path={group.image_url} name={group.name} size={96} />
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

      <Button title="Salvar" onPress={handleSave} disabled={!canSubmit} loading={submitting} />
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
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
