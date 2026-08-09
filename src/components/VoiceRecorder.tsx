import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';

const TRANSCRIPTION_LOCALE = 'en-AU';
const ANDROID_ON_DEVICE_SERVICE = 'com.google.android.as';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onRecordingDeleted?: () => void;
  onTranscriptComplete?: (transcript: string) => void;
  existingAudioUri?: string;
}

function deleteLocalRecording(uri?: string) {
  if (!uri) return;

  try {
    const recording = new File(uri);
    if (recording.exists) recording.delete();
  } catch (error) {
    console.warn('Could not delete voice recording:', error);
  }
}

function getRecognitionErrorMessage(code: string): string {
  switch (code) {
    case 'no-speech':
    case 'speech-timeout':
      return 'No speech was detected. Please try again and speak clearly.';
    case 'not-allowed':
      return 'Microphone access is required. Enable it in your device settings and try again.';
    case 'language-not-supported':
    case 'service-not-allowed':
      return 'Australian English offline speech recognition is not ready on this device.';
    case 'audio-capture':
      return 'The device could not capture audio for transcription.';
    default:
      return 'Speech recognition stopped unexpectedly. Please try again.';
  }
}

export function VoiceRecorder({
  onRecordingComplete,
  onRecordingDeleted,
  onTranscriptComplete,
  existingAudioUri,
}: VoiceRecorderProps) {
  const [hasRecording, setHasRecording] = useState(!!existingAudioUri);
  const [currentUri, setCurrentUri] = useState<string | undefined>(existingAudioUri);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionMessage, setRecognitionMessage] = useState('');
  const finalSegmentsRef = useRef<string[]>([]);
  const latestTranscriptRef = useRef('');
  const transcriptDeliveredRef = useRef(false);
  const previousRecordingRef = useRef<string | undefined>(existingAudioUri);
  const player = useAudioPlayer(currentUri ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    return () => {
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setIsRecognizing(true);
    setRecognitionMessage('Listening and transcribing on this device...');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const nextText = event.results[0]?.transcript.trim();
    if (!nextText) return;

    if (event.isFinal) {
      const lastSegment = finalSegmentsRef.current.at(-1);
      if (nextText !== lastSegment) finalSegmentsRef.current.push(nextText);
    }

    const completed = finalSegmentsRef.current.join(' ').trim();
    const transcript = event.isFinal
      ? completed
      : [completed, nextText].filter(Boolean).join(' ').trim();
    latestTranscriptRef.current = transcript;
  });

  useSpeechRecognitionEvent('audioend', (event) => {
    if (!event.uri) return;

    const oldUri = previousRecordingRef.current;
    setCurrentUri(event.uri);
    setHasRecording(true);
    previousRecordingRef.current = event.uri;
    onRecordingComplete(event.uri);
    if (oldUri && oldUri !== event.uri) deleteLocalRecording(oldUri);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'aborted') return;
    setRecognitionMessage('Transcription was not completed.');
    Alert.alert('Transcription Unavailable', getRecognitionErrorMessage(event.error));
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecognizing(false);
    const completedTranscript = latestTranscriptRef.current.trim();
    if (completedTranscript && !transcriptDeliveredRef.current) {
      transcriptDeliveredRef.current = true;
      onTranscriptComplete?.(completedTranscript);
      setRecognitionMessage('Added to Session Notes. Audio is stored only on this device.');
    } else {
      setRecognitionMessage('Audio is stored only on this device.');
    }
  });

  const downloadOfflineModel = async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
        locale: TRANSCRIPTION_LOCALE,
      });
      const message = result.status === 'download_scheduled'
        ? 'The Australian English model download has been scheduled. Try recording again after it finishes.'
        : 'Complete the Australian English download, then tap Start Recording again.';
      Alert.alert('Offline Model', message);
    } catch (error) {
      console.error('Could not start offline model download:', error);
      Alert.alert(
        'Offline Model Unavailable',
        'Install Australian English for on-device speech recognition in your phone settings, then try again.'
      );
    }
  };

  const beginOnDeviceRecognition = async () => {
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        Alert.alert('Speech Recognition Unavailable', 'Speech recognition is not enabled on this device.');
        return;
      }
      if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
        Alert.alert(
          'Private Transcription Unavailable',
          'This device does not support on-device speech recognition. Audio will not be sent to a cloud service.'
        );
        return;
      }
      if (!ExpoSpeechRecognitionModule.supportsRecording()) {
        Alert.alert(
          'Recording Unavailable',
          'This device cannot save audio while performing protected on-device transcription.'
        );
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record and transcribe a voice note.'
        );
        return;
      }

      if (Platform.OS === 'android') {
        const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({
          androidRecognitionServicePackage: ANDROID_ON_DEVICE_SERVICE,
        });
        const hasAustralianEnglish = locales.installedLocales.some(
          locale => locale.toLowerCase() === TRANSCRIPTION_LOCALE.toLowerCase()
        );
        if (!hasAustralianEnglish) {
          Alert.alert(
            'Offline Language Required',
            'Australian English must be downloaded before private speech-to-text can be used.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Download', onPress: downloadOfflineModel },
            ]
          );
          return;
        }
      }

      finalSegmentsRef.current = [];
      latestTranscriptRef.current = '';
      transcriptDeliveredRef.current = false;
      setRecognitionMessage('Starting private transcription...');
      ExpoSpeechRecognitionModule.start({
        lang: TRANSCRIPTION_LOCALE,
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: true,
        addsPunctuation: true,
        androidRecognitionServicePackage:
          Platform.OS === 'android' ? ANDROID_ON_DEVICE_SERVICE : undefined,
        recordingOptions: {
          persist: true,
          outputDirectory: Paths.document.uri,
          outputFileName: `voice-note-${Date.now()}.wav`,
        },
      });
    } catch (error) {
      console.error('Failed to start private transcription:', error);
      Alert.alert(
        'Transcription Unavailable',
        'Private speech-to-text could not start. Check that Australian English offline recognition is installed.'
      );
    }
  };

  const startRecording = () => {
    if (!hasRecording) {
      void beginOnDeviceRecognition();
      return;
    }

    Alert.alert(
      'Record Again?',
      'This replaces the saved audio. Notes already added to Session Notes will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => void beginOnDeviceRecognition() },
      ]
    );
  };

  const stopRecording = () => {
    setRecognitionMessage('Finishing the transcript...');
    ExpoSpeechRecognitionModule.stop();
  };

  const playRecording = async () => {
    if (!currentUri) return;
    try {
      player.replace(currentUri);
      await player.seekTo(0);
      player.play();
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  };

  const stopPlayback = async () => {
    player.pause();
    await player.seekTo(0);
  };

  const deleteRecording = () => {
    Alert.alert(
      'Delete Voice Recording',
      'Delete the saved audio? Any text already added to Session Notes will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteLocalRecording(currentUri);
            setCurrentUri(undefined);
            setHasRecording(false);
            previousRecordingRef.current = undefined;
            onRecordingDeleted?.();
            setRecognitionMessage('');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Voice Session Note</Text>
      <Text style={styles.privacyText}>
        Australian English transcription runs on this device. Audio is not uploaded by Click Note Taker.
      </Text>

      <View style={styles.controls}>
        {!isRecognizing && !hasRecording ? (
          <TouchableOpacity style={[styles.button, styles.recordButton]} onPress={startRecording}>
            <Text style={styles.buttonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : null}

        {isRecognizing ? (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording and transcribing</Text>
            </View>
            <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopRecording}>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {hasRecording && !isRecognizing ? (
          <View style={styles.playbackContainer}>
            <TouchableOpacity
              style={[styles.button, styles.playButton]}
              onPress={playerStatus.playing ? stopPlayback : playRecording}
            >
              <Text style={styles.buttonText}>{playerStatus.playing ? 'Stop' : 'Play'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.recordButton]} onPress={startRecording}>
              <Text style={styles.buttonText}>Record Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={deleteRecording}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {recognitionMessage ? <Text style={styles.statusText}>{recognitionMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  privacyText: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.fontSizeSmall,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  controls: { gap: SPACING.sm },
  recordingContainer: { alignItems: 'center', gap: SPACING.sm },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.error },
  recordingText: { fontSize: TYPOGRAPHY.fontSizeBase, color: COLORS.error, fontWeight: '600' },
  playbackContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  button: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: { fontSize: TYPOGRAPHY.fontSizeBase, fontWeight: '600', color: COLORS.surface },
  recordButton: { backgroundColor: COLORS.primary },
  stopButton: { backgroundColor: COLORS.error },
  playButton: { backgroundColor: COLORS.secondary },
  deleteButton: { backgroundColor: COLORS.textLight },
  statusText: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.fontSizeSmall,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
