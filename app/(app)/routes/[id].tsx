import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fonts, SCREEN_GUTTER } from '../../../constants/theme';
import { GhostRoute } from '../../../components/GhostRoute';
import { LoadingView } from '../../../components/LoadingView';
import { PedalPicker } from '../../../components/PedalPicker';
import { RouteMap } from '../../../components/RouteMap/RouteMap';
import { RoutePhotoThumb } from '../../../components/RoutePhotoThumb';
import { StatusText } from '../../../components/StatusText';
import { TRAIL_GUTTER, TrailNode } from '../../../components/TrailNode';
import { colors, live as liveColors, neutrals, palette } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { useLinkableEvents } from '../../../hooks/useLinkableEvents';
import { useRoute } from '../../../hooks/useRoute';
import { RoutePhoto, useRoutePhotos } from '../../../hooks/useRoutePhotos';
import { useRoutePoints } from '../../../hooks/useRoutePoints';
import { useRouteRecorder } from '../../../hooks/useRouteRecorder';
import {
  formatDistance,
  formatDuration,
  formatElapsed,
  formatElevation,
  formatLongDate,
  formatTime,
} from '../../../hooks/useRoutes';
import { useSignedImageUrl } from '../../../hooks/useSignedImageUrl';
import { TRACKING_PERMISSION_MESSAGES } from '../../../lib/routeTracking/permissions';
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
          <Ionicons name="close" size={28} color={palette.surface} />
        </TouchableOpacity>

        {url ? <Image source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" /> : null}

        {canDelete ? (
          <TouchableOpacity
            style={styles.viewerDelete}
            onPress={handleDelete}
            disabled={deleting}
            accessibilityLabel="Excluir foto"
            accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color={palette.surface} />
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
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const routeId = Number(id);
  const router = useRouter();
  const { user } = useAuth();

  const { route, loading, error, refresh, patchRoute, updateName, updateEvent, submitting, saveError } =
    useRoute(routeId);
  const isOwner = !!route && route.recorded_by === user?.id;
  const {
    interrupted,
    liveTotals,
    busy: recorderBusy,
    recorderError,
    permissionIssue,
    pause,
    resume,
    finish,
    sync: syncRecorder,
  } = useRouteRecorder(route, isOwner, patchRoute);
  const {
    points,
    loading: pointsLoading,
    refresh: refreshPoints,
  } = useRoutePoints(routeId, { live: route?.status === 'active', isOwner });
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
      refreshPoints();
      syncRecorder();
    }, [refresh, refreshPhotos, refreshPoints, syncRecorder])
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

  // Normalmente a lista é o pai desta tela; aberta pela aba Perfil, a origem
  // vem via ?from= (mesmo esquema do detalhe de pedal) e o dismissAll() evita
  // deixar esta tela pendurada no topo da pilha de Rotas.
  const handleBack = useCallback(() => {
    if (from === 'profile') {
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/profile');
      return;
    }

    // dismissTo volta para a lista que já está embaixo (o initialRouteName
    // garante que ela existe). replace empilhava uma segunda lista por cima
    // da primeira, e a pilha ficava [lista, lista].
    router.dismissTo('/routes');
  }, [router, from]);

  // dark: cabeçalho escuro do modo gravação, emendado na tela.
  const header = (dark: boolean) => (
    <Stack.Screen
      options={{
        headerStyle: { backgroundColor: dark ? liveColors.bg : palette.bg },
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 16, color: dark ? liveColors.ink : palette.ink },
        headerLeft: () => (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={8}
            accessibilityLabel="Voltar"
            accessibilityRole="button">
            <Ionicons name="chevron-back" size={24} color={dark ? liveColors.ink : palette.inkSecondary} />
          </TouchableOpacity>
        ),
      }}
    />
  );
  const backButton = header(false);

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

  const live = route.status === 'active';
  const finished = route.status === 'finished';
  const working = submitting || recorderBusy;

  // Enquanto o dono grava, os números vêm da sessão local (atualizada a cada
  // ponto); o banco só recebe os totais a cada lote e pode estar defasado.
  const elapsed = formatElapsed(route.started_at, route.finished_at);
  const movingTime = formatDuration(liveTotals?.movingSeconds ?? route.duration_seconds);
  const distance = formatDistance(liveTotals?.distanceMeters ?? route.distance_meters);
  const climb = formatElevation(liveTotals ? liveTotals.elevationGain : route.elevation_gain_meters);
  const minAltitude = liveTotals ? liveTotals.minAltitude : route.min_altitude_meters;
  const maxAltitude = liveTotals ? liveTotals.maxAltitude : route.max_altitude_meters;
  const altitudeRange =
    minAltitude !== null && maxAltitude !== null
      ? `${Math.round(Number(minAltitude))} – ${Math.round(Number(maxAltitude))} m`
      : null;

  const recorderMessage = permissionIssue ? TRACKING_PERMISSION_MESSAGES[permissionIssue] : recorderError;

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

  const photosSection = (dark: boolean) => (
    <View style={styles.photosSection}>
      <Text style={[styles.sectionTitle, dark && liveStyles.text]}>Fotos</Text>

      {photosError ? <StatusText variant="error">{photosError}</StatusText> : null}
      {addError ? <StatusText variant="error">{addError}</StatusText> : null}
      {deleteError ? <StatusText variant="error">{deleteError}</StatusText> : null}

      <View style={styles.photoGrid}>
        {isOwner ? (
          <TouchableOpacity
            style={[styles.addTile, dark && liveStyles.addTile]}
            onPress={handleAddPhoto}
            disabled={adding}
            accessibilityLabel="Adicionar foto"
            accessibilityRole="button">
            <Ionicons
              name={adding ? 'ellipsis-horizontal' : 'add'}
              size={22}
              color={dark ? liveColors.ink : palette.inkInactive}
            />
          </TouchableOpacity>
        ) : null}

        {photos.map((photo) => (
          <RoutePhotoThumb key={photo.id} path={photo.image_url} size={THUMB_SIZE} onPress={() => setViewingPhoto(photo)} />
        ))}
      </View>

      {!photosLoading && photos.length === 0 && !isOwner ? <Text style={styles.emptyPhotos}>Nenhuma foto ainda.</Text> : null}
    </View>
  );

  const photoViewer = viewingPhoto ? (
    <PhotoViewerModal
      photo={viewingPhoto}
      canDelete={viewingPhoto.uploaded_by === user?.id}
      deleting={deletingId === viewingPhoto.id}
      onDelete={handleDeletePhoto}
      onClose={() => setViewingPhoto(null)}
    />
  ) : null;

  // Modo gravação: quem grava vê a tela escura do design, com distância e
  // tempo em destaque e os dois botões lado a lado. Rotas finalizadas (ou de
  // outra pessoa) continuam no detalhe claro abaixo.
  if (isOwner && !finished) {
    const km = (liveTotals?.distanceMeters ?? (Number(route.distance_meters) || 0)) / 1000;
    const seconds = liveTotals?.movingSeconds ?? (Number(route.duration_seconds) || 0);

    return (
      <>
        {header(true)}
        <ScrollView style={liveStyles.container} contentContainerStyle={liveStyles.content}>
          <View style={liveStyles.topRow}>
            <Text style={liveStyles.eyebrow} numberOfLines={1}>
              {route.event_title ?? 'Pedal livre'}
            </Text>
            {stateLine ? <Text style={[liveStyles.eyebrow, live && liveStyles.eyebrowLive]}>{stateLine}</Text> : null}
          </View>

          <TextInput
            style={[styles.title, styles.titleInput, liveStyles.text]}
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={handleRename}
            onSubmitEditing={handleRename}
            returnKeyType="done"
            placeholder="Dar um nome"
            placeholderTextColor="rgba(249,244,240,0.45)"
            accessibilityLabel="Nome da rota"
          />

          <View style={liveStyles.map}>
            {points.length > 0 ? (
              <RouteMap points={points} live={live} height={250} />
            ) : (
              <View style={liveStyles.mapEmpty}>
                <GhostRoute />
                <Text style={liveStyles.mapCaption}>{pointsLoading ? ' ' : 'Aguardando sinal do GPS…'}</Text>
              </View>
            )}
          </View>

          <View style={liveStyles.numbers}>
            <View style={liveStyles.number}>
              <Text style={liveStyles.numberValue}>{km.toFixed(2).replace('.', ',')}</Text>
              <Text style={liveStyles.numberLabel}>km</Text>
            </View>
            <View style={liveStyles.number}>
              <Text style={liveStyles.numberValue}>{formatClock(seconds)}</Text>
              <Text style={liveStyles.numberLabel}>tempo</Text>
            </View>
          </View>

          {interrupted ? (
            <View style={[styles.interrupted, liveStyles.interrupted]}>
              <Text style={[styles.interruptedTitle, liveStyles.text]}>A gravação foi interrompida</Text>
              <Text style={[styles.interruptedText, liveStyles.textMuted]}>
                O GPS parou de gravar esta rota (o celular reiniciou ou o app foi fechado). Retome para continuar o
                traçado.
              </Text>
            </View>
          ) : null}

          <View style={liveStyles.actions}>
            {live && !interrupted ? (
              <>
                <LiveButton title="Pausar" icon="pause" onPress={pause} disabled={working} />
                <LiveButton title="Finalizar" icon="stop" accent onPress={finish} disabled={working} />
              </>
            ) : (
              <>
                <LiveButton title="Finalizar" icon="stop" onPress={finish} disabled={working} />
                <LiveButton title="Retomar" icon="play" accent onPress={resume} disabled={working} />
              </>
            )}
          </View>

          {recorderMessage ? <StatusText variant="error">{recorderMessage}</StatusText> : null}
          {permissionIssue && Platform.OS !== 'web' ? (
            <LiveButton title="Abrir configurações" onPress={() => Linking.openSettings()} />
          ) : null}
          {saveError ? <StatusText variant="error">{saveError}</StatusText> : null}

          {photosSection(true)}
        </ScrollView>
        {photoViewer}
      </>
    );
  }

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
          <StatLine
            label="distância"
            value={distance ?? (finished ? 'sem registro' : 'aguardando GPS')}
            muted={!distance}
          />
          {climb ? <StatLine label="subida" value={climb} /> : null}
          {altitudeRange ? <StatLine label="altitude" value={altitudeRange} /> : null}
          {route.event_title ? <StatLine label="pedal" value={route.event_title} /> : null}
        </View>

        {points.length > 0 ? (
          <RouteMap points={points} live={live} />
        ) : pointsLoading ? null : (
          <View style={styles.ghost}>
            <GhostRoute />
            <Text style={styles.ghostCaption}>
              {finished ? 'Esta rota não tem traçado.' : 'Aguardando sinal do GPS…'}
            </Text>
          </View>
        )}

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

        {photosSection(false)}
      </ScrollView>

      {photoViewer}
    </>
  );
}

// "12:34" ou "1:02:03": o relógio da gravação.
function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

type LiveButtonProps = {
  title: string;
  onPress: () => void;
  icon?: 'pause' | 'play' | 'stop';
  // accent: ação principal em terracota; sem ele, contorno claro.
  accent?: boolean;
  disabled?: boolean;
};

function LiveButton({ title, onPress, icon, accent = false, disabled = false }: LiveButtonProps) {
  return (
    <TouchableOpacity
      style={[liveStyles.button, accent ? liveStyles.buttonAccent : liveStyles.buttonOutline, disabled && liveStyles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button">
      {icon ? <Ionicons name={icon} size={13} color={accent ? palette.onPrimary : liveColors.ink} /> : null}
      <Text style={[liveStyles.buttonText, accent && liveStyles.buttonTextAccent]}>{title}</Text>
    </TouchableOpacity>
  );
}

// Modo gravação (tela escura do design).
const liveStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: liveColors.bg,
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    flexShrink: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    letterSpacing: 0.69,
    textTransform: 'uppercase',
    color: liveColors.ink,
    opacity: 0.55,
  },
  eyebrowLive: {
    color: liveColors.accent,
    opacity: 1,
  },
  text: {
    color: liveColors.ink,
  },
  textMuted: {
    color: liveColors.ink,
    opacity: 0.7,
  },
  map: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: liveColors.mapBorder,
  },
  mapEmpty: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mapCaption: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: liveColors.ink,
    opacity: 0.55,
  },
  numbers: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 44,
    paddingTop: 12,
    paddingBottom: 4,
  },
  number: {
    alignItems: 'center',
  },
  numberValue: {
    fontFamily: fonts.displayHeavy,
    fontSize: 46,
    lineHeight: 50,
    color: liveColors.ink,
    fontVariant: ['tabular-nums'],
  },
  numberLabel: {
    marginTop: 5,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    color: liveColors.ink,
    opacity: 0.5,
  },
  interrupted: {
    borderLeftColor: liveColors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: liveColors.border,
    backgroundColor: 'transparent',
  },
  buttonAccent: {
    backgroundColor: liveColors.accent,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: liveColors.ink,
  },
  buttonTextAccent: {
    color: palette.onPrimary,
  },
  addTile: {
    borderColor: liveColors.border,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutrals.paper,
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: 24,
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
    fontFamily: fonts.displayHeavy,
    fontSize: 21,
    lineHeight: 27,
    color: neutrals.ink,
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
    fontFamily: fonts.body,
    fontSize: 14,
    color: neutrals.mute,
  },
  stateLineLive: {
    color: colors.primary,
    fontFamily: fonts.bodyMedium,
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
    fontFamily: fonts.body,
    fontSize: 15,
    color: neutrals.ink,
  },
  trailTime: {
    fontSize: 15,
    fontFamily: fonts.bodySemi,
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
    fontFamily: fonts.body,
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
    fontFamily: fonts.body,
    fontSize: 13,
    color: neutrals.mute,
  },
  statValue: {
    fontSize: 16,
    fontFamily: fonts.bodySemi,
    color: neutrals.ink,
    fontVariant: ['tabular-nums'],
  },
  statValueMuted: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: neutrals.mute,
  },
  ghost: {
    alignItems: 'center',
    gap: 2,
  },
  ghostCaption: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: neutrals.mute,
    textAlign: 'center',
  },
  // Aviso, não erro: nada se perdeu, só falta religar o GPS. Por isso sem o
  // vermelho de colors.error -- uma faixa à esquerda no tom de "gravando".
  interrupted: {
    gap: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  interruptedTitle: {
    fontSize: 15,
    fontFamily: fonts.bodySemi,
    color: neutrals.ink,
  },
  interruptedText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: neutrals.slate,
  },
  photosSection: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: neutrals.ink,
    opacity: 0.7,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: neutrals.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotos: {
    fontFamily: fonts.body,
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
    color: palette.surface,
    fontFamily: fonts.bodySemi,
  },
});
