import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../../components/Button';
import { GhostRoute } from '../../../components/GhostRoute';
import { LoadingView } from '../../../components/LoadingView';
import { PedalPicker } from '../../../components/PedalPicker';
import { RoutePhotoThumb } from '../../../components/RoutePhotoThumb';
import { StatusText } from '../../../components/StatusText';
import { TRAIL_GUTTER, TrailNode } from '../../../components/TrailNode';
import { colors, neutrals } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { useLinkableEvents } from '../../../hooks/useLinkableEvents';
import { useRoute } from '../../../hooks/useRoute';
import { RoutePhoto, useRoutePhotos } from '../../../hooks/useRoutePhotos';
import {
  formatDistance,
  formatDuration,
  formatElapsed,
  formatLongDate,
  formatTime,
} from '../../../hooks/useRoutes';
import { useSignedImageUrl } from '../../../hooks/useSignedImageUrl';
import { ROUTE_PHOTOS_BUCKET } from '../../../lib/routePhotos';

const THUMB_SIZE = 100;

function PhotoViewerModal({
  photo,
  canDelete,
  deleting,
  onDelete,
  onClose,
}: {
  photo: RoutePhoto;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { url } = useSignedImageUrl(ROUTE_PHOTOS_BUCKET, photo.image_url);

  function handleDelete() {
    const message = 'Tem certeza que deseja excluir esta foto? Esta ação não pode ser desfeita.';

    // Mesmo caso do Alert.alert de múltiplos botões não confiável no React
    // Native Web já tratado nas telas de pedal/grupo.
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        onDelete();
      }
      return;
    }

    Alert.alert('Excluir foto', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerBackdrop}>
        <TouchableOpacity
          style={styles.viewerClose}
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel="Fechar"
          accessibilityRole="button">
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {url ? <Image source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" /> : null}

        {canDelete ? (
          <TouchableOpacity
            style={styles.viewerDelete}
            onPress={handleDelete}
            disabled={deleting}
            accessibilityLabel="Excluir foto"
            accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.viewerDeleteText}>{deleting ? 'Excluindo...' : 'Excluir'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}

// Uma linha da lista "rótulo -> valor". Sem caixa, sem coluna centralizada:
// lê-se como um registro de pedal, não como um painel de métricas.
function StatLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, muted && styles.statValueMuted]}>{value}</Text>
    </View>
  );
}

export default function RouteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Number(id);
  const router = useRouter();
  const { user } = useAuth();

  const { route, loading, error, refresh, updateStatus, updateName, updateEvent, submitting, saveError } =
    useRoute(routeId);
  const { events: linkableEvents } = useLinkableEvents(route?.started_at ?? null);
  const [nameDraft, setNameDraft] = useState('');
  const {
    photos,
    loading: photosLoading,
    error: photosError,
    refresh: refreshPhotos,
    addPhoto,
    adding,
    addError,
    deletePhoto,
    deletingId,
    deleteError,
  } = useRoutePhotos(routeId);
  const [viewingPhoto, setViewingPhoto] = useState<RoutePhoto | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshPhotos();
    }, [refresh, refreshPhotos])
  );

  // O rascunho segue a rota carregada, mas só quando o campo não está sendo
  // editado -- sobrescrevê-lo a cada refresh apagaria o que está sendo digitado.
  useEffect(() => {
    setNameDraft((current) => (current.length === 0 ? (route?.name ?? '') : current));
  }, [route?.name]);

  async function handleAddPhoto() {
    await addPhoto();
  }

  async function handleRename() {
    const next = nameDraft.trim();
    if (!route || next === (route.name ?? '') || next.length === 0) {
      setNameDraft(route?.name ?? '');
      return;
    }
    await updateName(next);
  }

  async function handleDeletePhoto() {
    if (!viewingPhoto) {
      return;
    }
    const ok = await deletePhoto(viewingPhoto);
    if (ok) {
      setViewingPhoto(null);
    }
  }

  // A lista é sempre o pai sensato desta tela -- mais simples que a tela de
  // detalhe de pedal, que é aberta via links de outras abas.
  const backButton = (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace('/routes')}
            hitSlop={8}
            accessibilityLabel="Voltar"
            accessibilityRole="button">
            <Ionicons name="chevron-back" size={26} color={neutrals.ink} />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (loading) {
    return (
      <>
        {backButton}
        <LoadingView />
      </>
    );
  }

  if (error || !route) {
    return (
      <>
        {backButton}
        <View style={styles.centered}>
          <StatusText variant="error">{error ?? 'Rota não encontrada.'}</StatusText>
        </View>
      </>
    );
  }

  const isOwner = route.recorded_by === user?.id;
  const live = route.status === 'active';
  const finished = route.status === 'finished';

  const elapsed = formatElapsed(route.started_at, route.finished_at);
  const movingTime = formatDuration(route.duration_seconds);
  const distance = formatDistance(route.distance_meters);

  // O estado vira uma frase no contexto em vez de um selo solto no canto.
  const stateLine = live
    ? route.started_at
      ? `Gravando desde ${formatTime(route.started_at)}`
      : 'Gravando'
    : route.status === 'paused'
      ? 'Pausada'
      : route.finished_at
        ? formatLongDate(route.finished_at)
        : route.started_at
          ? formatLongDate(route.started_at)
          : null;

  return (
    <>
      {backButton}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {isOwner ? (
            <View style={styles.titleRow}>
              <TextInput
                style={[styles.title, styles.titleInput]}
                value={nameDraft}
                onChangeText={setNameDraft}
                onBlur={handleRename}
                onSubmitEditing={handleRename}
                returnKeyType="done"
                placeholder="Dar um nome"
                placeholderTextColor={neutrals.mute}
                accessibilityLabel="Nome da rota"
              />
              <Ionicons name="pencil" size={15} color={neutrals.mute} style={styles.titlePencil} />
            </View>
          ) : (
            <Text style={styles.title}>{route.name ?? 'Rota sem nome'}</Text>
          )}
          {stateLine ? <Text style={[styles.stateLine, live && styles.stateLineLive]}>{stateLine}</Text> : null}
        </View>

        {/* A trilha só mostra os eventos que de fato guardamos (started_at e
            finished_at). Pausas não são registradas em lugar nenhum, então
            não aparecem aqui -- ganharão nós sozinhas se um dia forem
            gravadas. */}
        {route.started_at ? (
          <View style={styles.trail}>
            <View style={styles.trailRow}>
              <View style={styles.trailGutter}>
                <TrailNode variant="open" />
              </View>
              <Text style={styles.trailLabel}>Iniciada</Text>
              <Text style={styles.trailTime}>{formatTime(route.started_at)}</Text>
            </View>

            <View style={styles.trailSegmentRow}>
              <View style={styles.trailGutter}>
                {finished ? (
                  <View style={styles.trailSolid} />
                ) : (
                  <View style={styles.trailDashes}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <View key={index} style={styles.trailDash} />
                    ))}
                  </View>
                )}
              </View>
              {!finished ? <Text style={styles.trailPending}>ainda em andamento</Text> : null}
            </View>

            {finished && route.finished_at ? (
              <View style={styles.trailRow}>
                <View style={styles.trailGutter}>
                  <TrailNode variant="done" />
                </View>
                <Text style={styles.trailLabel}>Finalizada</Text>
                <Text style={styles.trailTime}>{formatTime(route.finished_at)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.stats}>
          {elapsed ? <StatLine label="tempo total" value={elapsed} /> : null}
          {movingTime ? <StatLine label="em movimento" value={movingTime} /> : null}
          <StatLine label="distância" value={distance ?? 'aguardando GPS'} muted={!distance} />
          {route.event_title ? <StatLine label="pedal" value={route.event_title} /> : null}
        </View>

        <View style={styles.ghost}>
          <GhostRoute />
          <Text style={styles.ghostCaption}>O traçado aparece aqui quando o GPS estiver ativo.</Text>
        </View>

        {isOwner && !finished ? (
          <View style={styles.actions}>
            {live ? (
              <Button title="Pausar" onPress={() => updateStatus('paused')} loading={submitting} />
            ) : (
              <Button title="Retomar" onPress={() => updateStatus('active')} loading={submitting} />
            )}
            <Button
              title="Finalizar rota"
              variant="destructive"
              onPress={() => updateStatus('finished')}
              loading={submitting}
            />
          </View>
        ) : null}

        {saveError ? <StatusText variant="error">{saveError}</StatusText> : null}

        {isOwner && finished ? (
          <PedalPicker
            title="Foi em algum pedal?"
            events={linkableEvents}
            selectedId={route.event_id}
            disabled={submitting}
            onSelect={updateEvent}
          />
        ) : null}

        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Fotos</Text>

          {photosError ? <StatusText variant="error">{photosError}</StatusText> : null}
          {addError ? <StatusText variant="error">{addError}</StatusText> : null}
          {deleteError ? <StatusText variant="error">{deleteError}</StatusText> : null}

          <View style={styles.photoGrid}>
            {isOwner ? (
              <TouchableOpacity
                style={styles.addTile}
                onPress={handleAddPhoto}
                disabled={adding}
                accessibilityLabel="Adicionar foto"
                accessibilityRole="button">
                <Ionicons name={adding ? 'ellipsis-horizontal' : 'add'} size={22} color={neutrals.mute} />
              </TouchableOpacity>
            ) : null}

            {photos.map((photo) => (
              <RoutePhotoThumb
                key={photo.id}
                path={photo.image_url}
                size={THUMB_SIZE}
                onPress={() => setViewingPhoto(photo)}
              />
            ))}
          </View>

          {!photosLoading && photos.length === 0 && !isOwner ? (
            <Text style={styles.emptyPhotos}>Nenhuma foto ainda.</Text>
          ) : null}
        </View>
      </ScrollView>

      {viewingPhoto ? (
        <PhotoViewerModal
          photo={viewingPhoto}
          canDelete={viewingPhoto.uploaded_by === user?.id}
          deleting={deletingId === viewingPhoto.id}
          onDelete={handleDeletePhoto}
          onClose={() => setViewingPhoto(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutrals.paper,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 22,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: neutrals.paper,
    padding: 24,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: neutrals.ink,
    letterSpacing: -0.5,
    lineHeight: 31,
  },
  titleInput: {
    flex: 1,
    // O campo precisa parecer o título que já era, não uma caixa de
    // formulário -- o lápis ao lado é o que sinaliza que dá para editar.
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  titlePencil: {
    marginTop: 4,
  },
  stateLine: {
    fontSize: 14,
    color: neutrals.mute,
  },
  stateLineLive: {
    color: colors.primary,
    fontWeight: '500',
  },
  trail: {
    marginTop: 2,
  },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trailGutter: {
    width: TRAIL_GUTTER,
    alignItems: 'center',
  },
  trailLabel: {
    flex: 1,
    fontSize: 15,
    color: neutrals.ink,
  },
  trailTime: {
    fontSize: 15,
    fontWeight: '600',
    color: neutrals.ink,
    fontVariant: ['tabular-nums'],
  },
  trailSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 44,
  },
  trailSolid: {
    width: 1,
    height: 44,
    backgroundColor: neutrals.ink,
  },
  trailDashes: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  trailDash: {
    width: 1,
    height: 5,
    marginBottom: 5,
    backgroundColor: neutrals.mute,
  },
  trailPending: {
    fontSize: 13,
    color: neutrals.mute,
  },
  stats: {
    gap: 10,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 13,
    color: neutrals.mute,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: neutrals.ink,
    fontVariant: ['tabular-nums'],
  },
  statValueMuted: {
    fontSize: 13,
    fontWeight: '400',
    color: neutrals.mute,
  },
  ghost: {
    alignItems: 'center',
    gap: 2,
  },
  ghostCaption: {
    fontSize: 12,
    color: neutrals.mute,
    textAlign: 'center',
  },
  actions: {
    gap: 8,
  },
  photosSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: neutrals.ink,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: neutrals.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotos: {
    fontSize: 13,
    color: neutrals.mute,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1,
  },
  viewerImage: {
    width: '100%',
    height: '75%',
  },
  viewerDelete: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.error,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewerDeleteText: {
    color: '#fff',
    fontWeight: '600',
  },
});
