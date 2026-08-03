import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { Footer } from '../../components/Footer';
import { VoiceRecorder } from '../../components/VoiceRecorder';
import { NDISProgressNoteView } from '../../components/NDISProgressNote';
import { 
  createNote, 
  updateNote, 
  getNoteById, 
  getClientById 
} from '../../database';
import { CustomPromptResponse, Note, NoteStatus, Client, RootStackParamList, SessionEntry, SUPPORT_CATEGORIES } from '../../types';
import { 
  convertToNDISProgressNote, 
  formatNDISProgressNoteAsText,
  getIncompleteFields,
} from '../../utils/ndisFormatter';
import { 
  formatAustralianDate, 
  formatAustralianTime,
  getCurrentISOTimestamp,
  parseAustralianDateToISO,
} from '../../utils/dateTime';
import { getUserProfile } from '../../utils/userProfile';
import {
  getMinuteTimestampForDate,
  parseSessionEntries,
  serializeSessionEntries,
} from '../../utils/sessionEntries';
import { COLORS, TYPOGRAPHY, SPACING, AUTOSAVE_INTERVAL } from '../../constants';
import {
  parseCustomPromptResponses,
  parseCustomPrompts,
  parseSessionSummaryPromptIds,
  serializeCustomPromptResponses,
} from '../../utils/sessionSummaryPrompts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type NoteEditorRouteProp = RouteProp<RootStackParamList, 'NoteEditor'>;

const NOTE_STATUS_COPY: Record<NoteStatus, { label: string; helper: string }> = {
  incomplete: {
    label: 'Incomplete',
    helper: 'Still being written. Finish time is left blank until the shift is finished.',
  },
  completed: {
    label: 'Completed',
    helper: 'Shift note has a finish time and is ready to review or submit.',
  },
  submitted: {
    label: 'Submitted',
    helper: 'This note has been marked as submitted.',
  },
};

function getStatusFromNote(noteData: Note): NoteStatus {
  return noteData.status || 'incomplete';
}

export function NoteEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<NoteEditorRouteProp>();
  const { clientId, noteId } = route.params;

  const [client, setClient] = useState<Client | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [sessionEntries, setSessionEntries] = useState<SessionEntry[]>([]);
  const [liveEntryDraft, setLiveEntryDraft] = useState('');
  const [audioUri, setAudioUri] = useState<string | undefined>();
  const [transcript, setTranscript] = useState('');
  const [timeIn, setTimeIn] = useState(getCurrentISOTimestamp());
  const [timeOut, setTimeOut] = useState<string | undefined>();
  const [noteStatus, setNoteStatus] = useState<NoteStatus>('incomplete');
  const [location, setLocation] = useState('');
  const [supportCategory, setSupportCategory] = useState('');
  const [goalsSupported, setGoalsSupported] = useState('');
  const [activitiesCompleted, setActivitiesCompleted] = useState('');
  const [observations, setObservations] = useState('');
  const [risksIncidents, setRisksIncidents] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [customPromptResponses, setCustomPromptResponses] = useState<CustomPromptResponse[]>([]);
  const [workerName, setWorkerName] = useState('');
  const [workerSignature, setWorkerSignature] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNDISView, setShowNDISView] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTimeInEditor, setShowTimeInEditor] = useState(false);
  const [showTimeOutEditor, setShowTimeOutEditor] = useState(false);
  const [showSessionEntryTimeEditor, setShowSessionEntryTimeEditor] = useState(false);
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [timeInDateInput, setTimeInDateInput] = useState(formatAustralianDate(timeIn));
  const [timeInTimeInput, setTimeInTimeInput] = useState(formatAustralianTime(timeIn));
  const [timeOutDateInput, setTimeOutDateInput] = useState(formatAustralianDate(getCurrentISOTimestamp()));
  const [timeOutTimeInput, setTimeOutTimeInput] = useState(formatAustralianTime(getCurrentISOTimestamp()));
  const [editingSessionEntryId, setEditingSessionEntryId] = useState<string | null>(null);
  const [sessionEntryDateInput, setSessionEntryDateInput] = useState(formatAustralianDate(getCurrentISOTimestamp()));
  const [sessionEntryTimeInput, setSessionEntryTimeInput] = useState(formatAustralianTime(getCurrentISOTimestamp()));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef<string | null>(noteId || null);

  useEffect(() => {
    loadData();
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Autosave effect
  useEffect(() => {
    if (hasUnsavedChanges && noteIdRef.current) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        saveNote(true);
      }, AUTOSAVE_INTERVAL);
    }
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    rawContent,
    sessionEntries,
    transcript,
    timeIn,
    timeOut,
    noteStatus,
    location,
    supportCategory,
    goalsSupported,
    activitiesCompleted,
    observations,
    risksIncidents,
    nextSteps,
    customPromptResponses,
    workerName,
    workerSignature,
    hasUnsavedChanges,
  ]);

  const loadData = async () => {
    try {
      const [clientData, userProfile] = await Promise.all([
        getClientById(clientId),
        getUserProfile(),
      ]);
      setClient(clientData);

      if (noteId) {
        const noteData = await getNoteById(noteId);
        if (noteData) {
          setNote(noteData);
          noteIdRef.current = noteData.id;
          setRawContent(noteData.rawContent || '');
          setSessionEntries(parseSessionEntries(noteData.sessionEntries));
          setAudioUri(noteData.audioUri);
          setTranscript(noteData.transcript || '');
          setTimeIn(noteData.timeIn);
          setTimeOut(noteData.timeOut);
          setNoteStatus(getStatusFromNote(noteData));
          setLocation(noteData.location || '');
          setSupportCategory(noteData.supportCategory || '');
          setGoalsSupported(noteData.goalsSupported || '');
          setActivitiesCompleted(noteData.activitiesCompleted || '');
          setObservations(noteData.observations || '');
          setRisksIncidents(noteData.risksIncidents || '');
          setNextSteps(noteData.nextSteps || '');
          setCustomPromptResponses(parseCustomPromptResponses(noteData.customPromptResponses));
          setWorkerName(noteData.workerName || '');
          setWorkerSignature(noteData.workerSignature || '');
        }
      } else {
        // Create a new note immediately
        const newNote = await createNote(clientId, {
          location: clientData?.address || userProfile.defaultLocation || undefined,
          workerName: userProfile.workerName || undefined,
          workerSignature: userProfile.workerSignature || userProfile.workerName || undefined,
        });
        setNote(newNote);
        noteIdRef.current = newNote.id;
        setTimeIn(newNote.timeIn);
        setNoteStatus(newNote.status);
        setLocation(newNote.location || '');
        setWorkerName(newNote.workerName || '');
        setWorkerSignature(newNote.workerSignature || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load note data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async (isAutosave = false) => {
    if (!noteIdRef.current) return;

    try {
      if (!isAutosave) setIsSaving(true);

      await updateNote(noteIdRef.current, {
        rawContent,
        sessionEntries: serializeSessionEntries(sessionEntries),
        audioUri,
        transcript,
        timeIn,
        timeOut,
        status: noteStatus,
        location,
        supportCategory,
        goalsSupported,
        activitiesCompleted,
        observations,
        risksIncidents,
        nextSteps,
        customPromptResponses: serializeCustomPromptResponses(customPromptResponses),
        workerName,
        workerSignature,
      });

      setHasUnsavedChanges(false);
      if (!isAutosave) {
        Alert.alert('Saved', 'Note saved successfully');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAutosave) {
        Alert.alert('Error', 'Failed to save note');
      }
    } finally {
      if (!isAutosave) setIsSaving(false);
    }
  };

  const handleContentChange = (text: string) => {
    setRawContent(text);
    setHasUnsavedChanges(true);
  };

  const handleRecordingComplete = (uri: string) => {
    setAudioUri(uri);
    setHasUnsavedChanges(true);
  };

  const handleTranscriptChange = (text: string) => {
    setTranscript(text);
    setHasUnsavedChanges(true);
  };

  const handleSetTimeOut = () => {
    setTimeOut(getCurrentISOTimestamp());
    setHasUnsavedChanges(true);
  };

  const handleAddSessionEntry = () => {
    const text = liveEntryDraft.trim();
    if (!text) return;

    setSessionEntries((entries) => [
      ...entries,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: getMinuteTimestampForDate(timeIn),
        text,
      },
    ]);
    setLiveEntryDraft('');
    setHasUnsavedChanges(true);
  };

  const handleDeleteSessionEntry = (id: string) => {
    setSessionEntries((entries) => entries.filter((entry) => entry.id !== id));
    setHasUnsavedChanges(true);
  };

  const openSessionEntryTimeEditor = (entry: SessionEntry) => {
    setEditingSessionEntryId(entry.id);
    setSessionEntryDateInput(formatAustralianDate(entry.timestamp));
    setSessionEntryTimeInput(formatAustralianTime(entry.timestamp));
    setShowSessionEntryTimeEditor(true);
  };

  const handleApplySessionEntryTime = () => {
    if (!editingSessionEntryId) return;

    try {
      const nextTimestamp = parseAustralianDateToISO(
        sessionEntryDateInput.trim(),
        sessionEntryTimeInput.trim()
      );
      if (Number.isNaN(new Date(nextTimestamp).getTime())) {
        throw new Error('Invalid date');
      }

      setSessionEntries((entries) =>
        entries
          .map((entry) =>
            entry.id === editingSessionEntryId ? { ...entry, timestamp: nextTimestamp } : entry
          )
          .sort((first, second) => first.timestamp.localeCompare(second.timestamp))
      );
      setHasUnsavedChanges(true);
      setShowSessionEntryTimeEditor(false);
      setEditingSessionEntryId(null);
    } catch (error) {
      Alert.alert('Invalid Note Time', 'Enter the date as DD/MM/YYYY and time as HH:MM AM/PM.');
    }
  };

  const openTimeOutEditor = () => {
    const editableTimeOut = timeOut || getCurrentISOTimestamp();
    setTimeOutDateInput(formatAustralianDate(editableTimeOut));
    setTimeOutTimeInput(formatAustralianTime(editableTimeOut));
    setShowTimeOutEditor(true);
  };

  const openTimeInEditor = () => {
    setTimeInDateInput(formatAustralianDate(timeIn));
    setTimeInTimeInput(formatAustralianTime(timeIn));
    setShowTimeInEditor(true);
  };

  const handleApplyTimeIn = () => {
    try {
      const nextTimeIn = parseAustralianDateToISO(timeInDateInput.trim(), timeInTimeInput.trim());
      if (Number.isNaN(new Date(nextTimeIn).getTime())) {
        throw new Error('Invalid date');
      }

      setTimeIn(nextTimeIn);
      setHasUnsavedChanges(true);
      setShowTimeInEditor(false);
    } catch (error) {
      Alert.alert('Invalid Time In', 'Enter the date as DD/MM/YYYY and time as HH:MM AM/PM.');
    }
  };

  const handleApplyTimeOut = () => {
    try {
      const nextTimeOut = parseAustralianDateToISO(timeOutDateInput.trim(), timeOutTimeInput.trim());
      if (Number.isNaN(new Date(nextTimeOut).getTime())) {
        throw new Error('Invalid date');
      }

      setTimeOut(nextTimeOut);
      setHasUnsavedChanges(true);
      setShowTimeOutEditor(false);
    } catch (error) {
      Alert.alert('Invalid Time Out', 'Enter the date as DD/MM/YYYY and time as HH:MM AM/PM.');
    }
  };

  const handleClearTimeOut = () => {
    setTimeOut(undefined);
    setNoteStatus('incomplete');
    setHasUnsavedChanges(true);
    setShowTimeOutEditor(false);
  };

  const handleFinishShift = () => {
    const selectedPrompts = parseSessionSummaryPromptIds(client?.sessionSummaryPromptIds);
    const customPrompts = parseCustomPrompts(client?.customSessionSummaryPrompts);
    if (selectedPrompts.length === 0 && customPrompts.length === 0) {
      handleCompleteWithReflection();
      return;
    }
    setShowReflectionForm(true);
  };

  const handleCompleteWithReflection = () => {
    if (!timeOut) {
      setTimeOut(getCurrentISOTimestamp());
    }
    setNoteStatus('completed');
    setHasUnsavedChanges(true);
    setShowReflectionForm(false);
  };

  const selectedSessionSummaryPrompts = parseSessionSummaryPromptIds(client?.sessionSummaryPromptIds);
  const selectedCustomPrompts = parseCustomPrompts(client?.customSessionSummaryPrompts);

  const updateCustomPromptResponse = (id: string, question: string, response: string) => {
    setCustomPromptResponses(current => {
      const existing = current.find(item => item.id === id);
      if (existing) {
        return current.map(item => item.id === id ? { ...item, question, response } : item);
      }
      return [...current, { id, question, response }];
    });
    setHasUnsavedChanges(true);
  };

  const handleMarkSubmitted = () => {
    if (!timeOut) {
      setTimeOut(getCurrentISOTimestamp());
    }
    setNoteStatus('submitted');
    setHasUnsavedChanges(true);
  };

  const handleReopenNote = () => {
    setNoteStatus(timeOut ? 'completed' : 'incomplete');
    setHasUnsavedChanges(true);
  };

  const buildCurrentNote = (baseNote: Note): Note => ({
    ...baseNote,
    rawContent,
    sessionEntries: serializeSessionEntries(sessionEntries),
    timeIn,
    timeOut,
    status: noteStatus,
    location,
    supportCategory,
    goalsSupported,
    activitiesCompleted,
    observations,
    risksIncidents,
    nextSteps,
    customPromptResponses: serializeCustomPromptResponses(customPromptResponses),
    workerName,
    workerSignature,
  });

  const confirmReportAction = (
    actionLabel: string,
    missingFields: string[],
    action: () => void | Promise<void>
  ) => {
    if (missingFields.length === 0) {
      void action();
      return;
    }

    Alert.alert(
      'Report may be incomplete',
      `Missing: ${missingFields.join(', ')}.\n\nReview the report preview or continue anyway.`,
      [
        { text: 'Review', style: 'cancel' },
        { text: `${actionLabel} Anyway`, onPress: () => { void action(); } },
      ]
    );
  };

  const handleCopyReport = () => {
    if (!client || !note) return;

    const progressNote = convertToNDISProgressNote(
      buildCurrentNote(note),
      client
    );
    const text = formatNDISProgressNoteAsText(progressNote);

    confirmReportAction('Copy', getIncompleteFields(progressNote), async () => {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Support Session Report copied to clipboard');
    });
  };

  const handleShareReport = () => {
    if (!client || !note) return;

    const progressNote = convertToNDISProgressNote(
      buildCurrentNote(note),
      client
    );
    const text = formatNDISProgressNoteAsText(progressNote);

    confirmReportAction('Share', getIncompleteFields(progressNote), async () => {
      try {
        await Share.share({ message: text });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    });
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: async () => {
            await saveNote();
            navigation.goBack();
          }},
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressNote = client && note
    ? convertToNDISProgressNote(
        buildCurrentNote(note),
        client
      )
    : null;
  const statusCopy = NOTE_STATUS_COPY[noteStatus];
  const statusBadgeStyle = {
    incomplete: [styles.statusBadge, styles.statusBadge_incomplete],
    completed: [styles.statusBadge, styles.statusBadge_completed],
    submitted: [styles.statusBadge, styles.statusBadge_submitted],
  }[noteStatus];
  const statusBadgeTextStyle = {
    incomplete: [styles.statusBadgeText, styles.statusBadgeText_incomplete],
    completed: [styles.statusBadgeText, styles.statusBadgeText_completed],
    submitted: [styles.statusBadgeText, styles.statusBadgeText_submitted],
  }[noteStatus];
  const statusPanelStyle = {
    incomplete: [styles.timeSection, styles.timeSection_incomplete],
    completed: [styles.timeSection, styles.timeSection_completed],
    submitted: [styles.timeSection, styles.timeSection_submitted],
  }[noteStatus];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {hasUnsavedChanges ? 'Editing...' : 'Note'}
        </Text>
        <TouchableOpacity 
          onPress={() => saveNote()} 
          style={styles.saveButton}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, !showNDISView && styles.tabActive]}
          onPress={() => setShowNDISView(false)}
        >
          <Text style={[styles.tabText, !showNDISView && styles.tabTextActive]}>
            Edit Note
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showNDISView && styles.tabActive]}
          onPress={() => setShowNDISView(true)}
        >
          <Text style={[styles.tabText, showNDISView && styles.tabTextActive]}>
            Report Preview
          </Text>
        </TouchableOpacity>
      </View>

      {showNDISView && progressNote ? (
        <View style={styles.ndisContainer}>
          <NDISProgressNoteView progressNote={progressNote} />
          <View style={styles.ndisActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopyReport}>
              <Text style={styles.actionButtonText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareReport}>
              <Text style={styles.actionButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>Client: {client?.fullName}</Text>
          </View>

          <View style={statusPanelStyle}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>Status</Text>
                <Text style={styles.statusHelper}>{statusCopy.helper}</Text>
              </View>
              <View style={statusBadgeStyle}>
                <Text style={statusBadgeTextStyle}>
                  {statusCopy.label}
                </Text>
              </View>
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Time In:</Text>
              <TouchableOpacity style={styles.timeEditButton} onPress={openTimeInEditor}>
                <Text style={styles.timeValue}>
                  {formatAustralianDate(timeIn)} {formatAustralianTime(timeIn)}
                </Text>
                <Text style={styles.timeEditText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Time Out:</Text>
              {timeOut ? (
                <TouchableOpacity style={styles.timeEditButton} onPress={openTimeOutEditor}>
                  <Text style={styles.timeValue}>
                    {formatAustralianDate(timeOut)} {formatAustralianTime(timeOut)}
                  </Text>
                  <Text style={styles.timeEditText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.setTimeButton} onPress={openTimeOutEditor} onLongPress={handleSetTimeOut}>
                  <Text style={styles.setTimeButtonText}>Set Time Out</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statusActions}>
              {noteStatus === 'incomplete' ? (
                <>
                  <TouchableOpacity style={styles.completeButton} onPress={handleFinishShift}>
                    <Text style={styles.completeButtonText}>
                      {timeOut ? 'Mark Complete' : 'Finish Shift'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitButton} onPress={handleMarkSubmitted}>
                    <Text style={styles.submitButtonText}>Mark Submitted</Text>
                  </TouchableOpacity>
                </>
              ) : noteStatus === 'completed' ? (
                <>
                  <TouchableOpacity style={styles.reopenButton} onPress={handleReopenNote}>
                    <Text style={styles.reopenButtonText}>Reopen Note</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitButton} onPress={handleMarkSubmitted}>
                    <Text style={styles.submitButtonText}>Mark Submitted</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.reopenButton} onPress={handleReopenNote}>
                  <Text style={styles.reopenButtonText}>Reopen Note</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              style={styles.fieldInput}
              value={location}
              onChangeText={(text) => { setLocation(text); setHasUnsavedChanges(true); }}
              placeholder="Where did the session take place?"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Support Category</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={supportCategory ? styles.pickerText : styles.pickerPlaceholder}>
                {supportCategory || 'Select a category'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Goals Supported</Text>
            <TextInput
              style={[styles.fieldInput, styles.multilineInput]}
              value={goalsSupported}
              onChangeText={(text) => { setGoalsSupported(text); setHasUnsavedChanges(true); }}
              placeholder="What goals were addressed?"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Worker Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={workerName}
              onChangeText={(text) => { setWorkerName(text); setHasUnsavedChanges(true); }}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Worker Signature</Text>
            <TextInput
              style={styles.fieldInput}
              value={workerSignature}
              onChangeText={(text) => { setWorkerSignature(text); setHasUnsavedChanges(true); }}
              placeholder="Signature for reports"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Session Notes</Text>
            <Text style={styles.fieldHelper}>
              Add brief notes as the session happens. Each entry is saved with the current time to the minute.
            </Text>
            <View style={styles.liveEntryComposer}>
              <TextInput
                style={[styles.fieldInput, styles.liveEntryInput]}
                value={liveEntryDraft}
                onChangeText={setLiveEntryDraft}
                placeholder="Add a live session entry"
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
              <TouchableOpacity
                style={[styles.addEntryButton, !liveEntryDraft.trim() && styles.addEntryButtonDisabled]}
                onPress={handleAddSessionEntry}
                disabled={!liveEntryDraft.trim()}
              >
                <Text style={styles.addEntryButtonText}>Add Note</Text>
              </TouchableOpacity>
            </View>

            {sessionEntries.length > 0 ? (
              <View style={styles.sessionEntryList}>
                {sessionEntries.map((entry) => (
                  <View key={entry.id} style={styles.sessionEntry}>
                    <View style={styles.sessionEntryContent}>
                      <Text style={styles.sessionEntryTime}>{formatAustralianTime(entry.timestamp)}</Text>
                      <Text style={styles.sessionEntryText}>{entry.text}</Text>
                    </View>
                    <View style={styles.sessionEntryActions}>
                      <TouchableOpacity
                        onPress={() => openSessionEntryTimeEditor(entry)}
                        style={styles.editEntryButton}
                      >
                        <Text style={styles.editEntryButtonText}>Edit Time</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSessionEntry(entry.id)}
                        style={styles.deleteEntryButton}
                      >
                        <Text style={styles.deleteEntryButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sessionSummaryLabel}>Session summary</Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              value={rawContent}
              onChangeText={handleContentChange}
              placeholder="Add any longer notes or overall context here"
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onTranscriptChange={handleTranscriptChange}
            existingAudioUri={audioUri}
          />

          {transcript ? (
            <View style={styles.transcriptContainer}>
              <Text style={styles.fieldLabel}>Transcript</Text>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.convertButton}
            onPress={() => setShowNDISView(true)}
          >
            <Text style={styles.convertButtonText}>
              Preview Report
            </Text>
          </TouchableOpacity>

          <View style={styles.spacer} />
        </ScrollView>
      )}

      <Footer />

      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Support Category</Text>
            <ScrollView style={styles.categoryList}>
              {SUPPORT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryItem,
                    supportCategory === category && styles.categoryItemSelected,
                  ]}
                  onPress={() => {
                    setSupportCategory(category);
                    setHasUnsavedChanges(true);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      supportCategory === category && styles.categoryTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSessionEntryTimeEditor}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSessionEntryTimeEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Note Time</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={sessionEntryDateInput}
                onChangeText={setSessionEntryDateInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TextInput
                style={styles.fieldInput}
                value={sessionEntryTimeInput}
                onChangeText={setSessionEntryTimeInput}
                placeholder="HH:MM AM/PM"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalCancelAction]}
                onPress={() => setShowSessionEntryTimeEditor(false)}
              >
                <Text style={styles.modalCancelActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalSaveAction]}
                onPress={handleApplySessionEntryTime}
              >
                <Text style={styles.modalSaveActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReflectionForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReflectionForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.reflectionModalContent]}>
            <Text style={styles.modalTitle}>Complete Session Summary</Text>
            <Text style={styles.reflectionIntro}>
              Complete the prompts selected in this client's profile.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {selectedSessionSummaryPrompts.includes('supports') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>What supports and activities were provided?</Text>
                <TextInput
                  style={[styles.fieldInput, styles.multilineInput]}
                  value={activitiesCompleted}
                  onChangeText={(text) => { setActivitiesCompleted(text); setHasUnsavedChanges(true); }}
                  placeholder="Activities, choices, routines, or skills practised"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />
              </View>
              )}
              {selectedSessionSummaryPrompts.includes('engagement') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>How did the client present and engage?</Text>
                <TextInput
                  style={[styles.fieldInput, styles.multilineInput]}
                  value={observations}
                  onChangeText={(text) => { setObservations(text); setHasUnsavedChanges(true); }}
                  placeholder="Presentation, communication, mood, participation, and strengths"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />
              </View>
              )}
              {selectedSessionSummaryPrompts.includes('changes') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Were there any changes, concerns, or incidents?</Text>
                <TextInput
                  style={[styles.fieldInput, styles.multilineInput]}
                  value={risksIncidents}
                  onChangeText={(text) => { setRisksIncidents(text); setHasUnsavedChanges(true); }}
                  placeholder="Changes to health, behaviour, routine, risks, or incidents"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />
              </View>
              )}
              {selectedSessionSummaryPrompts.includes('handover') && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>What should the next worker know or follow up?</Text>
                <TextInput
                  style={[styles.fieldInput, styles.multilineInput]}
                  value={nextSteps}
                  onChangeText={(text) => { setNextSteps(text); setHasUnsavedChanges(true); }}
                  placeholder="Handover details, appointments, preferences, or follow-up actions"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />
              </View>
              )}
              {selectedCustomPrompts.map((prompt) => (
                <View style={styles.field} key={prompt.id}>
                  <Text style={styles.fieldLabel}>{prompt.question}</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.multilineInput]}
                    value={customPromptResponses.find(item => item.id === prompt.id)?.response || ''}
                    onChangeText={(text) => updateCustomPromptResponse(prompt.id, prompt.question, text)}
                    placeholder="Enter your response"
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.reflectionActions}>
              <TouchableOpacity style={styles.reflectionContinueButton} onPress={() => setShowReflectionForm(false)}>
                <Text style={styles.modalCancelActionText}>Continue Editing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipReflectionButton} onPress={handleCompleteWithReflection}>
                <Text style={styles.skipReflectionButtonText}>Skip for Now and Mark Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeReflectionButton} onPress={handleCompleteWithReflection}>
                <Text style={styles.completeReflectionButtonText}>Save Summary and Mark Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimeInEditor}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTimeInEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Time In</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={timeInDateInput}
                onChangeText={setTimeInDateInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TextInput
                style={styles.fieldInput}
                value={timeInTimeInput}
                onChangeText={setTimeInTimeInput}
                placeholder="HH:MM AM/PM"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalCancelAction]}
                onPress={() => setShowTimeInEditor(false)}
              >
                <Text style={styles.modalCancelActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalSaveAction]}
                onPress={handleApplyTimeIn}
              >
                <Text style={styles.modalSaveActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimeOutEditor}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTimeOutEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Time Out</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={timeOutDateInput}
                onChangeText={setTimeOutDateInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TextInput
                style={styles.fieldInput}
                value={timeOutTimeInput}
                onChangeText={setTimeOutTimeInput}
                placeholder="HH:MM AM/PM"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalCancelAction]}
                onPress={() => setShowTimeOutEditor(false)}
              >
                <Text style={styles.modalCancelActionText}>Cancel</Text>
              </TouchableOpacity>
              {timeOut ? (
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalClearAction]}
                  onPress={handleClearTimeOut}
                >
                  <Text style={styles.modalClearActionText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalSaveAction]}
                onPress={handleApplyTimeOut}
              >
                <Text style={styles.modalSaveActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    color: COLORS.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    padding: SPACING.xs,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  clientInfo: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  clientName: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.surface,
  },
  timeSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderLeftWidth: 5,
  },
  timeSection_incomplete: {
    backgroundColor: '#FFF5F5',
    borderLeftColor: COLORS.error,
  },
  timeSection_completed: {
    backgroundColor: '#FFF8E1',
    borderLeftColor: '#D69E2E',
  },
  timeSection_submitted: {
    backgroundColor: '#F0FFF4',
    borderLeftColor: COLORS.success,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  statusHelper: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    lineHeight: 18,
    maxWidth: 210,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadge_incomplete: {
    backgroundColor: '#FED7D7',
    borderColor: COLORS.error,
  },
  statusBadge_completed: {
    backgroundColor: '#FEEBC8',
    borderColor: '#D69E2E',
  },
  statusBadge_submitted: {
    backgroundColor: '#C6F6D5',
    borderColor: COLORS.success,
  },
  statusBadgeText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '700',
  },
  statusBadgeText_incomplete: {
    color: '#C53030',
  },
  statusBadgeText_completed: {
    color: '#975A16',
  },
  statusBadgeText_submitted: {
    color: '#276749',
  },
  statusActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#D69E2E',
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.surface,
    fontWeight: '700',
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.surface,
    fontWeight: '700',
  },
  reopenButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  reopenButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.success,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timeLabel: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.text,
    width: 80,
  },
  timeValue: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
  },
  timeEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeEditText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  setTimeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  setTimeButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.surface,
    fontWeight: '600',
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  fieldHelper: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  fieldInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  liveEntryComposer: {
    gap: SPACING.sm,
  },
  liveEntryInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  addEntryButton: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  addEntryButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  addEntryButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.surface,
    fontWeight: '700',
  },
  sessionEntryList: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  sessionEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  sessionEntryContent: {
    flex: 1,
  },
  sessionEntryTime: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  sessionEntryText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    lineHeight: 21,
  },
  sessionEntryActions: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  editEntryButton: {
    paddingVertical: SPACING.xs,
  },
  editEntryButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  deleteEntryButton: {
    paddingVertical: SPACING.xs,
  },
  deleteEntryButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.error,
    fontWeight: '600',
  },
  sessionSummaryLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  pickerButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
  },
  pickerPlaceholder: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textMuted,
  },
  transcriptContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  transcriptText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    lineHeight: 22,
  },
  convertButton: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  convertButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.surface,
  },
  spacer: {
    height: SPACING.xxl,
  },
  ndisContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  ndisActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.lg,
    maxHeight: '70%',
  },
  reflectionModalContent: {
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizeLarge,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  reflectionIntro: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryItemSelected: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  categoryText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
  },
  categoryTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  reflectionActions: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  reflectionContinueButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  modalActionButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelAction: {
    backgroundColor: COLORS.background,
  },
  modalSaveAction: {
    backgroundColor: COLORS.primary,
  },
  modalClearAction: {
    backgroundColor: COLORS.error + '10',
  },
  modalCancelActionText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  modalSaveActionText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.surface,
    fontWeight: '600',
  },
  modalClearActionText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.error,
    fontWeight: '600',
  },
  skipReflectionButton: {
    alignItems: 'center',
    padding: SPACING.sm,
  },
  skipReflectionButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  completeReflectionButton: {
    alignItems: 'center',
    backgroundColor: '#D69E2E',
    borderRadius: 8,
    padding: SPACING.md,
  },
  completeReflectionButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.surface,
    fontWeight: '700',
  },
});
