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
import { Client, Note, NoteStatus, RootStackParamList } from '../../types';
import { formatAustralianDateTime, getRelativeTime } from '../../utils/dateTime';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ClientDetailRouteProp = RouteProp<RootStackParamList, 'ClientDetail'>;

function getNoteStatus(note: Note): NoteStatus {
  return note.status || 'incomplete';
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
  const [editNotes, setEditNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const clientData = await getClientById(clientId);
      if (clientData) {
        setClient(clientData);
        setEditName(clientData.fullName);
        setEditPreferredName(clientData.preferredName || '');
        setEditNdisNumber(clientData.ndisNumber || '');
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
        notes: editNotes.trim() || undefined,
      });
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', 'Failed to update client');
    }
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
        {item.rawContent || '[Empty note]'}
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
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes ({notes.length})</Text>
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => navigation.navigate('NoteEditor', { clientId })}
          >
            <Text style={styles.addNoteButtonText}>+ New Note</Text>
          </TouchableOpacity>
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
