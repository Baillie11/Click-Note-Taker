import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Footer } from '../../components/Footer';
import { 
  getClientById, 
  updateClient, 
  deleteClient, 
  getNotesByClientId, 
  deleteNote 
} from '../../database';
import { Client, ClientShift, CustomSessionSummaryPrompt, Note, NoteStatus, RootStackParamList } from '../../types';
import { formatAustralianDateTime, getRelativeTime } from '../../utils/dateTime';
import { parseSessionEntries } from '../../utils/sessionEntries';
import {
  SESSION_SUMMARY_PROMPTS,
  SessionSummaryPromptId,
  parseSessionSummaryPromptIds,
  parseCustomPrompts,
  serializeSessionSummaryPromptIds,
  serializeCustomPrompts,
} from '../../utils/sessionSummaryPrompts';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';
import { WEEKDAYS, isValidShiftTime, normalizeShiftTime, parseClientShifts, serializeClientShifts } from '../../utils/clientShifts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ClientDetailRouteProp = RouteProp<RootStackParamList, 'ClientDetail'>;

function getNoteStatus(note: Note): NoteStatus {
  return note.status || 'incomplete';
}

function getNotePreview(note: Note): string {
  const summary = note.rawContent?.trim();
  if (summary) return summary;

  const entries = parseSessionEntries(note.sessionEntries);
  if (entries.length > 0) return entries[entries.length - 1].text;

  return 'No session notes entered yet.';
}

const NOTE_STATUS_LABELS: Record<NoteStatus, string> = {
  incomplete: 'Incomplete',
  completed: 'Complete',
  submitted: 'Submitted',
};

function getNoteCardStatusStyle(status: NoteStatus) {
  switch (status) {
    case 'submitted':
      return styles.noteCard_submitted;
    case 'completed':
      return styles.noteCard_completed;
    default:
      return styles.noteCard_incomplete;
  }
}

function getNoteStatusBadgeStyle(status: NoteStatus) {
  switch (status) {
    case 'submitted':
      return [styles.noteStatusBadge, styles.noteStatusBadge_submitted];
    case 'completed':
      return [styles.noteStatusBadge, styles.noteStatusBadge_completed];
    default:
      return [styles.noteStatusBadge, styles.noteStatusBadge_incomplete];
  }
}

function getNoteStatusTextStyle(status: NoteStatus) {
  switch (status) {
    case 'submitted':
      return [styles.noteStatusText, styles.noteStatusText_submitted];
    case 'completed':
      return [styles.noteStatusText, styles.noteStatusText_completed];
    default:
      return [styles.noteStatusText, styles.noteStatusText_incomplete];
  }
}

export function ClientDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ClientDetailRouteProp>();
  const { clientId } = route.params;

  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPreferredName, setEditPreferredName] = useState('');
  const [editNdisNumber, setEditNdisNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSessionSummaryPromptIds, setEditSessionSummaryPromptIds] = useState<SessionSummaryPromptId[]>([]);
  const [editCustomPrompts, setEditCustomPrompts] = useState<CustomSessionSummaryPrompt[]>([]);
  const [newCustomPrompt, setNewCustomPrompt] = useState('');
  const [editShifts, setEditShifts] = useState<ClientShift[]>([]);
  const [newShiftWeekday, setNewShiftWeekday] = useState(new Date().getDay());
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('17:00');
  const [editNotes, setEditNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const clientData = await getClientById(clientId);
      if (clientData) {
        setClient(clientData);
        setEditName(clientData.fullName);
        setEditPreferredName(clientData.preferredName || '');
        setEditNdisNumber(clientData.ndisNumber || '');
        setEditAddress(clientData.address || '');
        setEditSessionSummaryPromptIds(parseSessionSummaryPromptIds(clientData.sessionSummaryPromptIds));
        setEditCustomPrompts(parseCustomPrompts(clientData.customSessionSummaryPrompts));
        setEditShifts(parseClientShifts(clientData.shifts));
        setEditNotes(clientData.notes || '');
      }
      const notesData = await getNotesByClientId(clientId);
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleEditClient = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    try {
      await updateClient(clientId, {
        fullName: editName.trim(),
        preferredName: editPreferredName.trim() || undefined,
        ndisNumber: editNdisNumber.trim() || undefined,
        address: editAddress.trim() || undefined,
        sessionSummaryPromptIds: serializeSessionSummaryPromptIds(editSessionSummaryPromptIds),
        customSessionSummaryPrompts: serializeCustomPrompts(editCustomPrompts),
        shifts: serializeClientShifts(editShifts),
        notes: editNotes.trim() || undefined,
      });
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', 'Failed to update client');
    }
  };

  const handleAddCustomPrompt = () => {
    const question = newCustomPrompt.trim();
    if (!question) return;
    setEditCustomPrompts(current => [
      ...current,
      { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, question },
    ]);
    setNewCustomPrompt('');
  };

  const handleAddShift = () => {
    if (!isValidShiftTime(newShiftStart) || !isValidShiftTime(newShiftEnd)) {
      Alert.alert('Invalid Shift Time', 'Enter shift times in 24-hour format, for example 09:00 or 17:30.');
      return;
    }
    setEditShifts(current => [
      ...current,
      {
        id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        weekday: newShiftWeekday,
        startTime: normalizeShiftTime(newShiftStart),
        endTime: normalizeShiftTime(newShiftEnd),
      },
    ]);
  };

  const handleDeleteClient = () => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client?.fullName}? This will also delete all their notes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(clientId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', 'Failed to delete client');
            }
          },
        },
      ]
    );
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(noteId);
              loadData();
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[styles.noteCard, getNoteCardStatusStyle(getNoteStatus(item))]}
      onPress={() => navigation.navigate('NoteEditor', { clientId, noteId: item.id })}
      onLongPress={() => handleDeleteNote(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteDate}>{formatAustralianDateTime(item.timeIn)}</Text>
        <View style={getNoteStatusBadgeStyle(getNoteStatus(item))}>
          <Text style={getNoteStatusTextStyle(getNoteStatus(item))}>
            {NOTE_STATUS_LABELS[getNoteStatus(item)]}
          </Text>
        </View>
      </View>
      <Text style={styles.noteTime}>{getRelativeTime(item.updatedAt)}</Text>
      <Text style={styles.noteContent} numberOfLines={3}>
        {getNotePreview(item)}
      </Text>
      {item.audioUri && (
        <Text style={styles.audioIndicator}>🎤 Voice recording attached</Text>
      )}
    </TouchableOpacity>
  );

  if (isLoading || !client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const noteCounts = notes.reduce(
    (counts, currentNote) => {
      counts.total += 1;
      counts[getNoteStatus(currentNote)] += 1;
      return counts;
    },
    { total: 0, incomplete: 0, completed: 0, submitted: 0 }
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clientHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {client.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.clientName}>{client.fullName}</Text>
        {client.preferredName && (
          <Text style={styles.preferredName}>"{client.preferredName}"</Text>
        )}
        {client.ndisNumber && (
          <Text style={styles.ndisNumber}>NDIS: {client.ndisNumber}</Text>
        )}
        {client.address && (
          <Text style={styles.clientAddress}>{client.address}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => navigation.navigate('NoteEditor', { clientId })}
          >
            <Text style={styles.addNoteButtonText}>+ New Note</Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.statusSummary}
          accessibilityLabel={`${noteCounts.total} total notes, ${noteCounts.incomplete} incomplete, ${noteCounts.completed} complete, ${noteCounts.submitted} submitted`}
        >
          <View style={[styles.statusSummaryItem, styles.statusSummaryDivider]}>
            <Text style={styles.statusSummaryTotal}>{noteCounts.total}</Text>
            <Text style={styles.statusSummaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Total
            </Text>
          </View>
          <View style={[styles.statusSummaryItem, styles.statusSummaryDivider]}>
            <Text style={styles.statusSummaryIncomplete}>{noteCounts.incomplete}</Text>
            <Text style={styles.statusSummaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Incomplete
            </Text>
          </View>
          <View style={[styles.statusSummaryItem, styles.statusSummaryDivider]}>
            <Text style={styles.statusSummaryCompleted}>{noteCounts.completed}</Text>
            <Text style={styles.statusSummaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Complete
            </Text>
          </View>
          <View style={styles.statusSummaryItem}>
            <Text style={styles.statusSummarySubmitted}>{noteCounts.submitted}</Text>
            <Text style={styles.statusSummaryLabel} numberOfLines={1} adjustsFontSizeToFit>
              Submitted
            </Text>
          </View>
        </View>

        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          contentContainerStyle={styles.notesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first note for this client
              </Text>
            </View>
          }
        />
      </View>

      <TouchableOpacity
        style={styles.incidentSection}
        onPress={() => navigation.navigate('IncidentReportsList', { clientId })}
      >
        <Text style={styles.incidentTitle}>Incident Reports (Coming Soon)</Text>
        <Text style={styles.incidentSubtitle}>
          Report and track incidents for this participant
        </Text>
      </TouchableOpacity>

      <Footer />

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Client</Text>

              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Preferred Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editPreferredName}
                onChangeText={setEditPreferredName}
                placeholder="Preferred name (optional)"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>NDIS Number</Text>
              <TextInput
                style={styles.modalInput}
                value={editNdisNumber}
                onChangeText={setEditNdisNumber}
                placeholder="NDIS number (optional)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Client Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Client address (optional)"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.notesInput]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Additional notes about this client"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.promptSectionTitle}>Regular Shifts</Text>
              <Text style={styles.promptSectionHelper}>
                Used to remind you when a shift note has not been submitted.
              </Text>
              {editShifts.map(shift => (
                <View key={shift.id} style={styles.shiftRow}>
                  <View style={styles.shiftDetails}>
                    <Text style={styles.shiftDay}>{WEEKDAYS[shift.weekday]}</Text>
                    <Text style={styles.shiftTime}>{shift.startTime} - {shift.endTime}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditShifts(current => current.filter(item => item.id !== shift.id))}>
                    <Text style={styles.removePromptButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.weekdayPicker}>
                {WEEKDAYS.map((day, index) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.weekdayButton, newShiftWeekday === index && styles.weekdayButtonSelected]}
                    onPress={() => setNewShiftWeekday(index)}
                  >
                    <Text style={[styles.weekdayButtonText, newShiftWeekday === index && styles.weekdayButtonTextSelected]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.shiftTimeInputs}>
                <View style={styles.shiftTimeField}>
                  <Text style={styles.inputLabel}>Start</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newShiftStart}
                    onChangeText={setNewShiftStart}
                    placeholder="09:00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.shiftTimeField}>
                  <Text style={styles.inputLabel}>Finish</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newShiftEnd}
                    onChangeText={setNewShiftEnd}
                    placeholder="17:00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.addPromptButton} onPress={handleAddShift}>
                <Text style={styles.addPromptButtonText}>Add Shift</Text>
              </TouchableOpacity>

              <Text style={styles.promptSectionTitle}>Session Summary Prompts</Text>
              <Text style={styles.promptSectionHelper}>
                Select the questions to ask when finishing this client's sessions.
              </Text>
              {SESSION_SUMMARY_PROMPTS.map((prompt) => {
                const isSelected = editSessionSummaryPromptIds.includes(prompt.id);
                return (
                  <TouchableOpacity
                    key={prompt.id}
                    style={styles.promptOption}
                    onPress={() => setEditSessionSummaryPromptIds((current) =>
                      isSelected
                        ? current.filter((id) => id !== prompt.id)
                        : [...current, prompt.id]
                    )}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={styles.promptOptionText}>{prompt.question}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.customPromptTitle}>Custom Prompts</Text>
              {editCustomPrompts.map((prompt) => (
                <View key={prompt.id} style={styles.customPromptRow}>
                  <TextInput
                    style={[styles.modalInput, styles.customPromptInput]}
                    value={prompt.question}
                    onChangeText={(question) => setEditCustomPrompts(current =>
                      current.map(item => item.id === prompt.id ? { ...item, question } : item)
                    )}
                    placeholder="End-of-shift question"
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.removePromptButton}
                    onPress={() => setEditCustomPrompts(current => current.filter(item => item.id !== prompt.id))}
                  >
                    <Text style={styles.removePromptButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                style={styles.modalInput}
                value={newCustomPrompt}
                onChangeText={setNewCustomPrompt}
                placeholder="Add your own question"
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
              <TouchableOpacity
                style={[styles.addPromptButton, !newCustomPrompt.trim() && styles.addPromptButtonDisabled]}
                onPress={handleAddCustomPrompt}
                disabled={!newCustomPrompt.trim()}
              >
                <Text style={styles.addPromptButtonText}>Add Prompt</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleEditClient}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.deleteClientButton}
                onPress={handleDeleteClient}
              >
                <Text style={styles.deleteClientButtonText}>Delete Client</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  editButton: {
    padding: SPACING.xs,
  },
  editButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.primary,
    fontWeight: '500',
  },
  clientHeader: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSizeTitle,
    fontWeight: '600',
    color: COLORS.surface,
  },
  clientName: {
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  preferredName: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  ndisNumber: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    marginTop: 4,
  },
  clientAddress: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    flex: 1,
    padding: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  addNoteButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  addNoteButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.surface,
  },
  statusSummary: {
    minHeight: 72,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  statusSummaryItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  statusSummaryDivider: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  statusSummaryTotal: {
    fontSize: TYPOGRAPHY.fontSizeLarge,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusSummaryIncomplete: {
    fontSize: TYPOGRAPHY.fontSizeLarge,
    fontWeight: '700',
    color: '#C53030',
  },
  statusSummaryCompleted: {
    fontSize: TYPOGRAPHY.fontSizeLarge,
    fontWeight: '700',
    color: '#975A16',
  },
  statusSummarySubmitted: {
    fontSize: TYPOGRAPHY.fontSizeLarge,
    fontWeight: '700',
    color: '#276749',
  },
  statusSummaryLabel: {
    width: '100%',
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  notesList: {
    paddingBottom: SPACING.md,
  },
  noteCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteCard_incomplete: {
    backgroundColor: '#FFF5F5',
    borderLeftColor: COLORS.error,
  },
  noteCard_completed: {
    backgroundColor: '#FFF8E1',
    borderLeftColor: '#D69E2E',
  },
  noteCard_submitted: {
    backgroundColor: '#F0FFF4',
    borderLeftColor: COLORS.success,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  noteDate: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '600',
    color: COLORS.primary,
  },
  noteTime: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  noteStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  noteStatusBadge_incomplete: {
    backgroundColor: '#FED7D7',
    borderColor: COLORS.error,
  },
  noteStatusBadge_completed: {
    backgroundColor: '#FEEBC8',
    borderColor: '#D69E2E',
  },
  noteStatusBadge_submitted: {
    backgroundColor: '#C6F6D5',
    borderColor: COLORS.success,
  },
  noteStatusText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '700',
  },
  noteStatusText_incomplete: {
    color: '#C53030',
  },
  noteStatusText_completed: {
    color: '#975A16',
  },
  noteStatusText_submitted: {
    color: '#276749',
  },
  noteContent: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    lineHeight: 22,
  },
  audioIndicator: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.secondary,
    marginTop: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    color: COLORS.textLight,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  incidentSection: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.disabled,
    borderRadius: 12,
    opacity: 0.7,
  },
  incidentTitle: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  incidentSubtitle: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollView: {
    flex: 1,
    marginTop: 100,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.lg,
    minHeight: '100%',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  promptSectionTitle: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  promptSectionHelper: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  promptOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxMark: {
    color: COLORS.surface,
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '700',
  },
  promptOptionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    lineHeight: 21,
  },
  customPromptTitle: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  customPromptRow: {
    marginBottom: SPACING.sm,
  },
  customPromptInput: {
    height: 'auto',
    minHeight: 48,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  removePromptButton: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  removePromptButtonText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '600',
  },
  addPromptButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  addPromptButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  addPromptButtonText: {
    color: COLORS.surface,
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
  },
  shiftRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  shiftDetails: {
    flex: 1,
  },
  shiftDay: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.text,
  },
  shiftTime: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    marginTop: 2,
  },
  weekdayPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginVertical: SPACING.sm,
  },
  weekdayButton: {
    minWidth: 44,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  weekdayButtonText: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.text,
  },
  weekdayButtonTextSelected: {
    color: COLORS.surface,
    fontWeight: '700',
  },
  shiftTimeInputs: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  shiftTimeField: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.surface,
    fontWeight: '600',
  },
  deleteClientButton: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    alignItems: 'center',
  },
  deleteClientButtonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.error,
    fontWeight: '600',
  },
});
