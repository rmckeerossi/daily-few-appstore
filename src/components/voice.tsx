import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme/tokens';

import { useToast } from './toast';

export const MAX_VOICE_SECONDS = 300;

// Waveform silhouette from the design export: 26 fixed bar heights.
const WAVE = [8, 14, 22, 12, 26, 18, 10, 20, 28, 16, 9, 24, 14, 30, 18, 12, 22, 8, 16, 26, 12, 20, 10, 18, 24, 14];

export function mmss(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Waveform({ progress, active }: { progress: number; active: boolean }) {
  const lit = Math.round(progress * WAVE.length);
  return (
    <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {WAVE.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: active || progress > 0 ? h : 3,
              backgroundColor: i < lit ? colors.lilac : 'rgba(254,252,242,0.28)',
            },
          ]}
        />
      ))}
    </View>
  );
}

export type Recording = { uri: string; seconds: number };

/**
 * Voice memo row on the Answer screen: record (up to 5:00, stops on its own
 * and keeps the recording), play it back, or delete it to record again.
 * `recording.uri` is a local file for a new memo, or a signed link for a saved one.
 */
export function VoiceRecorder({ recording, onChange }: {
  recording: Recording | null;
  onChange: (next: Recording | null) => void;
}) {
  const toast = useToast();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const stopping = useRef(false);

  const seconds = state.isRecording ? state.durationMillis / 1000 : (recording?.seconds ?? 0);

  const stop = async (reachedLimit = false) => {
    if (stopping.current) return;
    stopping.current = true;
    const secs = Math.min(MAX_VOICE_SECONDS, recorder.currentTime || state.durationMillis / 1000);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    stopping.current = false;
    if (recorder.uri) onChange({ uri: recorder.uri, seconds: secs });
    if (reachedLimit) toast('Five minutes. Recording saved.');
  };

  // Stops on its own at five minutes, and keeps what was recorded.
  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_VOICE_SECONDS * 1000) stop(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRecording, state.durationMillis]);

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Microphone is off',
        'To record a voice memo, allow Daily Few to use the microphone in Settings.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  if (recording && !state.isRecording) {
    return (
      <View style={styles.pill}>
        <SavedMemo uri={recording.uri} seconds={recording.seconds} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete voice memo"
          hitSlop={10}
          onPress={() => onChange(null)}
          style={styles.trash}>
          <Trash2 size={18} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.pill, state.isRecording && { borderColor: colors.lilac }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.isRecording ? 'Stop recording' : 'Record a voice memo'}
        onPress={() => (state.isRecording ? stop() : start())}
        style={[styles.recordButton, { backgroundColor: state.isRecording ? colors.burgundy500 : colors.paleCream }]}>
        {state.isRecording ? (
          <Square size={16} color={colors.paleCream} strokeWidth={1.5} fill={colors.paleCream} />
        ) : (
          <Mic size={20} color={colors.burgundy} strokeWidth={1.5} />
        )}
      </Pressable>
      <Waveform progress={seconds / MAX_VOICE_SECONDS} active={state.isRecording} />
      <Text style={styles.timer}>
        {mmss(seconds)} / {mmss(MAX_VOICE_SECONDS)}
      </Text>
    </View>
  );
}

/** Play/pause with waveform progress and time. Used inside the recorder. */
function SavedMemo({ uri, seconds }: { uri: string; seconds: number }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || seconds;

  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  const toggle = () => (status.playing ? player.pause() : player.play());

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice memo' : 'Play voice memo'}
        onPress={toggle}
        style={[styles.recordButton, { backgroundColor: colors.paleCream }]}>
        {status.playing ? (
          <Pause size={18} color={colors.burgundy} strokeWidth={1.5} fill={colors.burgundy} />
        ) : (
          <Play size={18} color={colors.burgundy} strokeWidth={1.5} fill={colors.burgundy} />
        )}
      </Pressable>
      <Waveform progress={duration ? status.currentTime / duration : 0} active />
      <Text style={styles.timer}>{mmss(status.playing ? status.currentTime : duration)}</Text>
    </>
  );
}

/** Compact player for light sheets: play/pause pill with the length. */
export function VoicePill({ uri, seconds }: { uri: string; seconds: number }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause voice memo' : 'Play voice memo'}
      onPress={() => (status.playing ? player.pause() : player.play())}
      style={styles.lightPill}>
      {status.playing ? (
        <Pause size={16} color={colors.burgundy} strokeWidth={1.5} fill={colors.burgundy} />
      ) : (
        <Play size={16} color={colors.burgundy} strokeWidth={1.5} fill={colors.burgundy} />
      )}
      <Text style={[type.data, { color: colors.burgundy }]}>
        {mmss(status.playing ? status.currentTime : status.duration || seconds)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.16)',
    backgroundColor: colors.surface,
  },
  recordButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 32, overflow: 'hidden' },
  bar: { width: 3, borderRadius: 2 },
  timer: { ...type.data, color: colors.textSecondary, minWidth: 40, textAlign: 'right' },
  trash: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  lightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(76,28,49,0.2)',
  },
});
