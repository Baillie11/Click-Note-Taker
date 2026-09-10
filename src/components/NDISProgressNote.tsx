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

      {[
        progressNote.activeHoursOvernight,
        progressNote.behaviorsOfConcern,
        progressNote.goalProgressDescription,
        progressNote.goalProgressOutcome,
        progressNote.moodEmotionalState,
        progressNote.physicalHealthObservations,
        progressNote.appetiteFluidIntake,
        progressNote.hygieneGrooming,
        progressNote.presentationChanges,
      ].some(hasProgressNoteValue) && (
        <>
          <View style={styles.divider} />
          <View style={styles.workerDetails}>
            <Text style={styles.groupTitle}>Shift Note Details</Text>
            {renderField('If Overnight — Active Awake Hours', progressNote.activeHoursOvernight)}
            {renderField('Behaviours of Concern', progressNote.behaviorsOfConcern)}
            {renderField('How Shift Worked Toward Goal', progressNote.goalProgressDescription)}
            {renderField('Was Progress Made', progressNote.goalProgressOutcome)}
            {renderField('Mood and Emotional State', progressNote.moodEmotionalState)}
            {renderField('Physical Health Observations', progressNote.physicalHealthObservations)}
            {renderField('Appetite and Fluid Intake', progressNote.appetiteFluidIntake)}
            {renderField('Personal Hygiene and Grooming', progressNote.hygieneGrooming)}
            {renderField('Change from Usual Presentation', progressNote.presentationChanges)}
          </View>
        </>
      )}

      {[
        progressNote.communityLocationPurpose,
        progressNote.communityDuration,
        progressNote.communityParticipation,
        progressNote.transportUsed,
        progressNote.mileageClaimSubmitted,
      ].some(hasProgressNoteValue) && (
        <>
          <View style={styles.divider} />
          <View style={styles.workerDetails}>
            <Text style={styles.groupTitle}>Community Access / Activities</Text>
            {renderField('Location(s) Visited and Purpose', progressNote.communityLocationPurpose)}
            {renderField('Duration of Outing', progressNote.communityDuration)}
            {renderField('Client Participation and Engagement', progressNote.communityParticipation)}
            {renderField('Transport Used', progressNote.transportUsed)}
            {renderField('Mileage Claim Submitted', progressNote.mileageClaimSubmitted)}
          </View>
        </>
      )}

      {[
        progressNote.medicationNameDosage,
        progressNote.medicationTimeAdministered,
        progressNote.medicationRoute,
        progressNote.medicationResponse,
        progressNote.medicationRefusal,
      ].some(hasProgressNoteValue) && (
        <>
          <View style={styles.divider} />
          <View style={styles.workerDetails}>
            <Text style={styles.groupTitle}>Medication</Text>
            {renderField('Medication Name and Dosage', progressNote.medicationNameDosage)}
            {renderField('Time Administered', progressNote.medicationTimeAdministered)}
            {renderField('Route of Administration', progressNote.medicationRoute)}
            {renderField("Client's Response / Observations", progressNote.medicationResponse)}
            {renderField('Medication Refused', progressNote.medicationRefusal)}
          </View>
        </>
      )}

      {[
        progressNote.incidentOccurred,
        progressNote.incidentDescription,
        progressNote.supervisorNotified,
        progressNote.incidentReportSubmitted,
      ].some(hasProgressNoteValue) && (
        <>
          <View style={styles.divider} />
          <View style={styles.workerDetails}>
            <Text style={styles.groupTitle}>Incidents, Accidents and Reportable Events</Text>
            {renderField('Incident Occurred', progressNote.incidentOccurred)}
            {renderField('Incident Description', progressNote.incidentDescription)}
            {renderField('Supervisor Notified', progressNote.supervisorNotified)}
            {renderField('Incident Report Submitted in ShiftCare', progressNote.incidentReportSubmitted)}
          </View>
        </>
      )}

      {[
        progressNote.tasksNotCompleted,
        progressNote.followUpActions,
        progressNote.handoverNotes,
      ].some(hasProgressNoteValue) && (
        <>
          <View style={styles.divider} />
          <View style={styles.workerDetails}>
            <Text style={styles.groupTitle}>Handover and Follow-Up</Text>
            {renderField('Tasks Not Completed and Reason', progressNote.tasksNotCompleted)}
            {renderField('Follow-Up Actions Required', progressNote.followUpActions)}
            {renderField('Handover / Information for Next Worker', progressNote.handoverNotes)}
          </View>
        </>
      )}

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
