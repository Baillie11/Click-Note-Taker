import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Footer } from '../../components/Footer';
import { getClientById, getIncidentReportsByClientId } from '../../database';
import { Client, IncidentReport, RootStackParamList } from '../../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type IncidentReportsListRouteProp = RouteProp<RootStackParamList, 'IncidentReportsList'>;

export function IncidentReportsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<IncidentReportsListRouteProp>();
  const { clientId } = route.params;

  const [client, setClient] = useState<Client | null>(null);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const clientData = await getClientById(clientId);
      setClient(clientData);
      const reportsData = await getIncidentReportsByClientId(clientId);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Reports</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.comingSoonBanner}>
        <Text style={styles.comingSoonIcon}>🚧</Text>
        <Text style={styles.comingSoonTitle}>Coming Soon</Text>
        <Text style={styles.comingSoonText}>
          Incident report functionality is currently under development. 
          This feature will allow you to create, track, and manage incident 
          reports for your NDIS participants.
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Planned Features:</Text>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📝</Text>
          <Text style={styles.featureText}>Create detailed incident reports</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📅</Text>
          <Text style={styles.featureText}>Date and time tracking</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>👤</Text>
          <Text style={styles.featureText}>Witness information</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📤</Text>
          <Text style={styles.featureText}>Export and share reports</Text>
        </View>
      </View>

      {client && (
        <View style={styles.clientInfo}>
          <Text style={styles.clientLabel}>Client:</Text>
          <Text style={styles.clientName}>{client.fullName}</Text>
        </View>
      )}

      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  placeholder: {
    width: 60,
  },
  comingSoonBanner: {
    margin: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.warning + '15',
    borderRadius: 12,
    alignItems: 'center',
  },
  comingSoonIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  comingSoonTitle: {
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: SPACING.sm,
  },
  comingSoonText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  featuresTitle: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  featureText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
  },
  clientInfo: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  clientLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
  },
  clientName: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
});
