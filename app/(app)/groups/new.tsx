import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/Button';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { StatusText } from '../../../components/StatusText';
import { TextField } from '../../../components/TextField';
import { colors, palette } from '../../../constants/colors';
import { useGroupMutations } from '../../../hooks/useGroupMutations';
import { PickedImage, useImageUpload } from '../../../hooks/useImageUpload';
import { fonts, radii, SCREEN_GUTTER } from '../../../constants/theme';

const PRIVACY_OPTIONS: { key: 'public' | 'private'; label: string }[] = [
  { key: 'public', label: 'Público' },
  { key: 'private', label: 'Privado' },
];

export default function NewGroup() {
  // Navegador da pilha da aba Grupos (esta tela é uma rota dela).
  const navigation = useNavigation();
  const { createGroup, updateGroup, submitting, error } = useGroupMutations();
  const { pickImage, uploadGroupCover, picking, uploading, error: imageError } = useImageUpload();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Garante formulario em branco a cada entrada, mesmo que a instancia
  // desta tela sobreviva entre aberturas (era o caso quando ela saia com
  // router.replace, que nao a desmontava).
  useFocusEffect(
    useCallback(() => {
      setName('');
      setDescription('');
      setIsPrivate(false);
      setDiscoverable(false);
      setPickedImage(null);
      setSaveError(null);
    }, [])
  );

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

    // create_group() não recebe discoverable; como quem cria já é admin, um
    // update logo em seguida resolve sem mudar a assinatura da RPC.
    if (isPrivate && discoverable) {
      await updateGroup(group.id, { discoverable: true });
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

    // A pilha de Grupos é remontada do zero como [lista, grupo novo]:
    // - tira este modal da pilha (mesmo motivo de new-event.tsx: deixado
    //   pendurado, as telas abertas depois herdam o contexto de modal no iOS);
    // - garante que o "voltar" do grupo novo leve à lista. replace deixava o
    //   grupo sozinho, sem voltar; dismissAll + push às vezes não esvaziava
    //   a pilha e o voltar caía num grupo aberto antes.
    navigation.reset({
      index: 1,
      routes: [{ name: 'index' }, { name: '[id]/index', params: { id: String(group.id) } }],
    } as never);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
        {pickedImage ? (
          <Image source={{ uri: pickedImage.uri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={26} color={palette.inkSecondary} />
            <Text style={styles.imagePlaceholderText}>Escolher foto de capa</Text>
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

      <View>
        <Text style={styles.fieldLabel}>Privacidade</Text>
        <SegmentedControl
          options={PRIVACY_OPTIONS}
          active={isPrivate ? 'private' : 'public'}
          onChange={(key) => setIsPrivate(key === 'private')}
          disabled={busy}
        />
        <Text style={styles.privacyNote}>
          Público: qualquer pessoa pode entrar. Privado: a pessoa pede para entrar e um admin aprova.
        </Text>
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
            thumbColor={palette.surface}
          />
        </View>
      ) : null}

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
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 16,
  },
  // Capa de 130px, como no design.
  imagePicker: {
    width: '100%',
    marginBottom: 4,
  },
  imagePreview: {
    width: '100%',
    height: 130,
    borderRadius: radii.card,
    backgroundColor: colors.placeholder,
  },
  imagePlaceholder: {
    width: '100%',
    height: 130,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: palette.inkSecondary,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: palette.ink,
    opacity: 0.7,
    marginBottom: 8,
  },
  privacyNote: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 16,
    color: palette.ink,
    opacity: 0.55,
    marginTop: 8,
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
    fontFamily: fonts.display,
    fontSize: 14,
    color: palette.ink,
  },
  privacyHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkSecondary,
    maxWidth: 240,
  },
});
