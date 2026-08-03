import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Footer } from '../../components/Footer';
import { getAllClients, createClient, searchClients, getNotesCountByClientId } from '../../database';
import { Client, RootStackParamList } from '../../types';
import { getRelativeTime } from '../../utils/dateTime';
import { APP_NAME, COLORS, TYPOGRAPHY, SPACING } from '../../constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ClientsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [clients, setClients] = useState<Client[]>([]);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNdis, setNewClientNdis] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  const loadClients = useCallback(async () => {
    try {
      const data = searchQuery 
        ? await searchClients(searchQuery)
        : await getAllClients();
      setClients(data);

      // Load note counts
      const counts: Record<string, number> = {};
      for (const client of data) {
        counts[client.id] = await getNotesCountByClientId(client.id);
      }
      setNoteCounts(counts);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadClients();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, loadClients]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadClients();
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    try {
      await createClient({
        fullName: newClientName.trim(),
        ndisNumber: newClientNdis.trim() || undefined,
        address: newClientAddress.trim() || undefined,
      });
      setShowAddModal(false);
      setNewClientName('');
      setNewClientNdis('');
      setNewClientAddress('');
      loadClients();
    } catch (error) {
      console.error('Error creating client:', error);
      Alert.alert('Error', 'Failed to create client');
    }
  };

  const renderClient = ({ item }: { item: Client }) => {
    const noteCount = noteCounts[item.id] || 0;
    
    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => navigation.navigate('ClientDetail', { clientId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.clientInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.clientDetails}>
            <Text style={styles.clientName}>{item.fullName}</Text>
            {item.preferredName && (
              <Text style={styles.preferredName}>"{item.preferredName}"</Text>
            )}
            {item.ndisNumber && (
              <Text style={styles.ndisNumber}>NDIS: {item.ndisNumber}</Text>
            )}
            <Text style={styles.noteCount}>
              {noteCount} note{noteCount !== 1 ? 's' : ''} • Updated {getRelativeTime(item.updatedAt)}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{APP_NAME}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading...' : searchQuery ? 'No clients found' : 'No clients yet'}
            </Text>
            {!isLoading && !searchQuery && (
              <Text style={styles.emptySubtext}>
                Tap the + button to add your first client
              </Text>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Footer />

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>
            
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter client's full name"
              placeholderTextColor={COLORS.textMuted}
              value={newClientName}
              onChangeText={setNewClientName}
              autoFocus
            />
            
            <Text style={styles.inputLabel}>NDIS Number (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter NDIS number"
              placeholderTextColor={COLORS.textMuted}
              value={newClientNdis}
              onChangeText={setNewClientNdis}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Client Address (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter client's address"
              placeholderTextColor={COLORS.textMuted}
              value={newClientAddress}
              onChangeText={setNewClientAddress}
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewClientName('');
                  setNewClientNdis('');
                  setNewClientAddress('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddClient}
              >
                <Text style={styles.saveButtonText}>Add Client</Text>
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
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    height: 44,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  list: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSizeLarge,
    fontWeight: '600',
    color: COLORS.surface,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  preferredName: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  ndisNumber: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textLight,
  },
  noteCount: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    color: COLORS.textLight,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.surface,
    fontWeight: '300',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
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
});
