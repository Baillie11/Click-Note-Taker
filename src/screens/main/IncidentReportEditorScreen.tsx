import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Footer } from '../../components/Footer';
import { RootStackParamList } from '../../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function IncidentReportEditorScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Report</Text>
        <View style={styles.saveButton}>
          <Text style={styles.saveButtonTextDisabled}>Save</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.disabledBanner}>
          <Text style={styles.disabledIcon}>🔒</Text>
          <Text style={styles.disabledTitle}>Feature Disabled</Text>
          <Text style={styles.disabledText}>
            Incident report creation is not yet available. This feature is 
            coming soon in a future update.
          </Text>
        </View>

        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Preview of Future Fields:</Text>
          
          <View style={styles.previewField}>
            <Text style={styles.previewLabel}>Incident Date & Time</Text>
            <View style={styles.previewInput}>
              <Text style={styles.previewPlaceholder}>DD/MM/YYYY HH:MM</Text>
            </View>
          </View>

          <View style={styles.previewField}>
            <Text style={styles.previewLabel}>Location</Text>
            <View style={styles.previewInput}>
              <Text style={styles.previewPlaceholder}>Where did the incident occur?</Text>
            </View>
          </View>

          <View style={styles.previewField}>
            <Text style={styles.previewLabel}>Description</Text>
            <View style={[styles.previewInput, styles.previewTextArea]}>
              <Text style={styles.previewPlaceholder}>Describe what happened...</Text>
            </View>
          </View>

          <View style={styles.previewField}>
            <Text style={styles.previewLabel}>Immediate Actions Taken</Text>
            <View style={[styles.previewInput, styles.previewTextArea]}>
              <Text style={styles.previewPlaceholder}>What actions were taken?</Text>
            </View>
          </View>

          <View style={styles.previewField}>
            <Text style={styles.previewLabel}>Reported To</Text>
            <View style={styles.previewInput}>
              <Text style={styles.previewPlaceholder}>Who was notified?</Text>
            </View>
          </View>
        </View>
      </View>

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
  saveButton: {
    padding: SPACING.xs,
  },
  saveButtonTextDisabled: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.disabled,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  disabledBanner: {
    padding: SPACING.lg,
    backgroundColor: COLORS.disabled + '30',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  disabledIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  disabledTitle: {
    fontSize: TYPOGRAPHY.fontSizeLarge,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  disabledText: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    opacity: 0.6,
  },
  previewTitle: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  previewField: {
    marginBottom: SPACING.md,
  },
  previewLabel: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  previewInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewTextArea: {
    minHeight: 80,
  },
  previewPlaceholder: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.disabled,
  },
});
