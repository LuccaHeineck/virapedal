import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../../../components/Button';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
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
  const { updateGroup, submitting, error: saveError, deleteGroup, deleting, deleteError } = useGroupMutations();
  const { pickImage, uploadGroupCover, picking, uploading, error: imageError } = useImageUpload();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? '');
      setIsPrivate(group.privacy === 'private');
      setDiscoverable(group.discoverable);
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

  const busy = submitting || picking || uploading || deleting;
  // "Salvar" só quando algo do formulário mudou. A foto não entra aqui: ela é
  // salva na hora em que é escolhida (handlePickImage). discoverable compara
  // o valor efetivo -- num grupo público ele é sempre gravado como false.
  const hasChanges =
    name.trim() !== group.name ||
    description.trim() !== (group.description ?? '') ||
    isPrivate !== (group.privacy === 'private') ||
    (isPrivate && discoverable) !== group.discoverable;
  const canSubmit = name.trim().length > 0 && hasChanges && !busy;

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
      // Grupo público já aparece por inteiro; o campo só vale para privados.
      discoverable: isPrivate && discoverable,
    });
    if (updated) {
      router.back();
    }
  }

  async function confirmAndDelete() {
    const ok = await deleteGroup(groupId);
    // Fecha antes de navegar: esta tela continua na pilha durante o
    // dismissAll, e um Modal visível ficaria sobreposto na lista.
    setConfirmDeleteOpen(false);
    if (ok) {
      router.dismissAll();
    }
  }

  // O aviso diz o que se perde -- pedais e participações saem junto (ON
  // DELETE CASCADE), para todos os membros.
  const otherMembers = group.members_count - 1;
  const deleteMessage =
    otherMembers > 0
      ? `O grupo, seus pedais e participações serão excluídos para todos os ${group.members_count} membros. Esta ação não pode ser desfeita.`
      : 'O grupo, seus pedais e participações serão excluídos. Esta ação não pode ser desfeita.';

  return (
    <>
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
        <View style={styles.privacyTextGroup}>
          <Text style={styles.privacyLabel}>Grupo privado</Text>
          <Text style={styles.privacyHint}>
            {isPrivate ? 'Entrada mediante aprovação de um admin.' : 'Qualquer pessoa pode entrar diretamente.'}
          </Text>
        </View>
        <Switch
          value={isPrivate}
          onValueChange={setIsPrivate}
          disabled={busy}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {isPrivate ? (
        <View style={styles.privacyRow}>
          <View style={styles.privacyTextGroup}>
            <Text style={styles.privacyLabel}>Visível em Descobrir</Text>
            <Text style={styles.privacyHint}>
              {discoverable
                ? 'Aparece para todos com o nome e os admins, e recebe solicitações de entrada.'
                : 'Escondido de quem não é membro. Não recebe novas solicitações.'}
            </Text>
          </View>
          <Switch
            value={discoverable}
            onValueChange={setDiscoverable}
            disabled={busy}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      ) : null}

      {imageError ? <StatusText variant="error">{imageError}</StatusText> : null}
      {saveError ? <StatusText variant="error">{saveError}</StatusText> : null}

      <Button title="Salvar" onPress={handleSave} disabled={!canSubmit} loading={submitting} />

      {/* Excluir fica isolado no fim da tela, longe do "Salvar" (mesmo
          padrão do "Sair" nas Configurações). */}
      <View style={styles.dangerZone}>
        {deleteError ? <StatusText variant="error">{deleteError}</StatusText> : null}
        <Button title="Excluir grupo" variant="destructive" onPress={() => setConfirmDeleteOpen(true)} disabled={busy} />
      </View>
    </ScrollView>

    <ConfirmDialog
      visible={confirmDeleteOpen}
      title="Excluir este grupo?"
      message={deleteMessage}
      confirmLabel="Excluir grupo"
      onConfirm={confirmAndDelete}
      onCancel={() => setConfirmDeleteOpen(false)}
      loading={deleting}
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
    gap: 16,
  },
  // marginTop: 'auto' empurra "Excluir grupo" para o fim da tela quando sobra
  // espaço; o filete separa a zona destrutiva das ações de edição.
  dangerZone: {
    marginTop: 'auto',
    paddingTop: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  // Sem isto, o texto (sem limite de largura) empurra o Switch pra fora da
  // tela em vez de quebrar linha, escondendo-o em telas mais estreitas.
  privacyTextGroup: {
    flex: 1,
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
