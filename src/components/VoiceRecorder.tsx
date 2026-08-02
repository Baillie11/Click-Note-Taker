import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onTranscriptChange?: (transcript: string) => void;
  existingAudioUri?: string;
}

export function VoiceRecorder({
  onRecordingComplete,
  onTranscriptChange,
  existingAudioUri,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(!!existingAudioUri);
  const [currentUri, setCurrentUri] = useState<string | undefined>(existingAudioUri);
  const [permissionResponse, setPermissionResponse] = useState<Audio.PermissionResponse | null>(null);

  useEffect(() => {
    checkPermissions();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const checkPermissions = async () => {
    try {
      const response = await Audio.getPermissionsAsync();
      setPermissionResponse(response);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const response = await Audio.requestPermissionsAsync();
      setPermissionResponse(response);
      return response.granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      if (!permissionResponse?.granted) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Microphone permission is required to record voice notes. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        setCurrentUri(uri);
        setHasRecording(true);
        onRecordingComplete(uri);
        
        // Note: Speech-to-text would be implemented here with a pluggable provider
        // For now, we just save the audio URI
        if (onTranscriptChange) {
          onTranscriptChange('[Voice recording saved - transcription available with speech provider]');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  const playRecording = async () => {
    if (!currentUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  };

  const stopPlayback = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this voice recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCurrentUri(undefined);
            setHasRecording(false);
            if (onTranscriptChange) {
              onTranscriptChange('');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Voice Recording</Text>
      
      <View style={styles.controls}>
        {!isRecording && !hasRecording && (
          <TouchableOpacity
            style={[styles.button, styles.recordButton]}
            onPress={startRecording}
          >
            <Text style={styles.buttonText}>🎤 Start Recording</Text>
          </TouchableOpacity>
        )}

        {isRecording && (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording: {formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopRecording}
            >
              <Text style={styles.buttonText}>⏹ Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasRecording && !isRecording && (
          <View style={styles.playbackContainer}>
            <TouchableOpacity
              style={[styles.button, styles.playButton]}
              onPress={isPlaying ? stopPlayback : playRecording}
            >
              <Text style={styles.buttonText}>
                {isPlaying ? '⏹ Stop' : '▶️ Play'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.recordButton]}
              onPress={startRecording}
            >
              <Text style={styles.buttonText}>🎤 Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={deleteRecording}
            >
              <Text style={styles.buttonText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!permissionResponse?.granted && (
        <Text style={styles.permissionText}>
          Microphone permission required for voice recording
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  controls: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  recordingContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  recordingText: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    color: COLORS.error,
    fontWeight: '600',
  },
  playbackContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  button: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.surface,
  },
  recordButton: {
    backgroundColor: COLORS.primary,
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  playButton: {
    backgroundColor: COLORS.secondary,
  },
  deleteButton: {
    backgroundColor: COLORS.textLight,
  },
  permissionText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.warning,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
