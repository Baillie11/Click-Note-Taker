import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NDISProgressNote as NDISProgressNoteType } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { hasProgressNoteValue } from '../utils/ndisFormatter';

interface NDISProgressNoteProps {
  progressNote: NDISProgressNoteType;
}

export function NDISProgressNoteView({ progressNote }: NDISProgressNoteProps) {
  const renderField = (label: string, value: string) => {
    if (!hasProgressNoteValue(value)) return null;

    const isPlaceholder = value.startsWith('[');
    
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, isPlaceholder && styles.placeholder]}>
          {value}
        </Text>
      </View>
    );
  };

  const renderSection = (title: string, content: string) => {
    if (!hasProgressNoteValue(content)) return null;

    const isPlaceholder = content.startsWith('[');
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={[styles.sectionContent, isPlaceholder && styles.placeholder]}>
          {content}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Support Session Report</Text>
      </View>

      <View style={styles.basicInfo}>
        {renderField('Participant Name', progressNote.participantName)}
        {renderField('Date', progressNote.date)}
        
        <View style={styles.row}>
          <View style={styles.halfField}>
            {renderField('Time In', progressNote.timeIn)}
          </View>
          <View style={styles.halfField}>
            {renderField('Time Out', progressNote.timeOut)}
          </View>
        </View>
        {renderField('Duration', progressNote.duration)}
        {renderField('Location', progressNote.location)}
      </View>

      <View style={styles.divider} />

      {hasProgressNoteValue(progressNote.supportCategory) && (
        <>
          <View style={styles.supportDetails}>
            <Text style={styles.groupTitle}>Support Details</Text>
            {renderField('Support Category', progressNote.supportCategory)}
          </View>
          <View style={styles.divider} />
        </>
      )}

      {renderSection('Session Notes', progressNote.sessionTimeline)}
      {renderSection('Session Summary', progressNote.sessionSummary)}
      {renderSection('Activities and Supports', progressNote.activitiesCompleted)}
      {renderSection('Participant Response', progressNote.observations)}
      {renderSection('Goals Supported', progressNote.goalsSupported)}
      {renderSection('Risks / Incidents', progressNote.risksIncidents)}
      {renderSection('Medication Assistance', progressNote.medicationAssistance)}
      {renderSection('Next Steps', progressNote.nextSteps)}
      {renderSection('Additional Session Details', progressNote.customPromptResponses)}

      {(hasProgressNoteValue(progressNote.workerName) ||
        hasProgressNoteValue(progressNote.workerSignature)) && (
        <>
          <View style={styles.divider} />
          <View style={styles.workerDetails}>
            <Text style={styles.groupTitle}>Worker Details</Text>
            {renderField('Worker Name', progressNote.workerName)}
            {renderField('Signature', progressNote.workerSignature)}
          </View>
        </>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizeXLarge,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  basicInfo: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfField: {
    flex: 1,
  },
  field: {
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizeSmall,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    marginTop: 2,
  },
  placeholder: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  groupTitle: {
    fontSize: TYPOGRAPHY.fontSizeMedium,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  supportDetails: {
    gap: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionContent: {
    fontSize: TYPOGRAPHY.fontSizeBase,
    color: COLORS.text,
    lineHeight: 24,
  },
  workerDetails: {
    gap: SPACING.sm,
  },
  spacer: {
    height: SPACING.xl,
  },
});
