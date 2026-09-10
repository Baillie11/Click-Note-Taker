import { Note, Client, NDISProgressNote } from '../types';
import { calculateDuration, formatAustralianDate, formatAustralianTime } from './dateTime';
import { formatSessionEntries, parseSessionEntries } from './sessionEntries';
import { parseCustomPromptResponses } from './sessionSummaryPrompts';

export function hasProgressNoteValue(value?: string): boolean {
  const trimmedValue = value?.trim();
  return trimmedValue !== undefined && trimmedValue !== '' && !trimmedValue.startsWith('[');
}

/**
 * Convert a raw note to NDIS Progress Note format
 * Does NOT fabricate content - uses placeholders where data is missing
 */
export function convertToNDISProgressNote(
  note: Note,
  client: Client
): NDISProgressNote {
  return {
    participantName: client.fullName || '[Add participant name]',
    date: note.timeIn ? formatAustralianDate(note.timeIn) : '[Add date]',
    timeIn: note.timeIn ? formatAustralianTime(note.timeIn) : '[Add time in]',
    timeOut: note.timeOut ? formatAustralianTime(note.timeOut) : '[Add time out]',
    duration: note.timeOut ? calculateDuration(note.timeIn, note.timeOut) : '[Add time out]',
    location: note.location || '[Add location]',
    supportCategory: note.supportCategory || '[Select support category]',
    goalsSupported: note.goalsSupported || '[Add goals supported]',
    sessionSummary: note.rawContent?.trim() || '[Add session summary]',
    activitiesCompleted: note.activitiesCompleted?.trim() || '[Add activities completed]',
    sessionTimeline: formatSessionEntries(parseSessionEntries(note.sessionEntries)),
    observations: note.observations?.trim() || '[Add observations / participant response]',
    risksIncidents: note.risksIncidents?.trim() || '[Add risks or incidents]',
    medicationAssistance: note.medicationAssistance?.trim() || '[Add medication assistance]',
    nextSteps: note.nextSteps?.trim() || '[Add recommendations]',
    customPromptResponses: parseCustomPromptResponses(note.customPromptResponses)
      .filter(item => item.response.trim())
      .map(item => `${item.question}\n${item.response.trim()}`)
      .join('\n\n'),
    workerName: note.workerName || '[Add worker name]',
    workerSignature: note.workerSignature || '[Add signature]',
    activeHoursOvernight: note.activeHoursOvernight?.trim() || '',
    behaviorsOfConcern: note.behaviorsOfConcern?.trim() || '',
    goalProgressDescription: note.goalProgressDescription?.trim() || '',
    goalProgressOutcome: note.goalProgressOutcome?.trim() || '',
    moodEmotionalState: note.moodEmotionalState?.trim() || '',
    physicalHealthObservations: note.physicalHealthObservations?.trim() || '',
    appetiteFluidIntake: note.appetiteFluidIntake?.trim() || '',
    hygieneGrooming: note.hygieneGrooming?.trim() || '',
    presentationChanges: note.presentationChanges?.trim() || '',
    communityLocationPurpose: note.communityLocationPurpose?.trim() || '',
    communityDuration: note.communityDuration?.trim() || '',
    communityParticipation: note.communityParticipation?.trim() || '',
    transportUsed: note.transportUsed?.trim() || '',
    mileageClaimSubmitted: note.mileageClaimSubmitted?.trim() || '',
    medicationNameDosage: note.medicationNameDosage?.trim() || '',
    medicationTimeAdministered: note.medicationTimeAdministered?.trim() || '',
    medicationRoute: note.medicationRoute?.trim() || '',
    medicationResponse: note.medicationResponse?.trim() || '',
    medicationRefusal: note.medicationRefusal?.trim() || '',
    incidentOccurred: note.incidentOccurred?.trim() || '',
    incidentDescription: note.incidentDescription?.trim() || '',
    supervisorNotified: note.supervisorNotified?.trim() || '',
    incidentReportSubmitted: note.incidentReportSubmitted?.trim() || '',
    tasksNotCompleted: note.tasksNotCompleted?.trim() || '',
    followUpActions: note.followUpActions?.trim() || '',
    handoverNotes: note.handoverNotes?.trim() || '',
  };
}

/**
 * Format NDIS Progress Note as plain text for copying/sharing
 */
export function formatNDISProgressNoteAsText(progressNote: NDISProgressNote): string {
  const fields = (values: Array<[string, string]>) =>
    values
      .filter(([, value]) => hasProgressNoteValue(value))
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n');
  const section = (title: string, value: string) =>
    hasProgressNoteValue(value) ? `${title}\n\n${value}` : '';

  const reportParts = [
    fields([
      ['Participant Name', progressNote.participantName],
      ['Date', progressNote.date],
      ['Time In', progressNote.timeIn],
      ['Time Out', progressNote.timeOut],
      ['Duration', progressNote.duration],
      ['Location', progressNote.location],
      ['Support Category', progressNote.supportCategory],
    ]),
    section('SESSION NOTES', progressNote.sessionTimeline),
    section('SESSION SUMMARY', progressNote.sessionSummary),
    section('ACTIVITIES AND SUPPORTS', progressNote.activitiesCompleted),
    section('PARTICIPANT RESPONSE', progressNote.observations),
    section('GOALS SUPPORTED', progressNote.goalsSupported),
    section('RISKS / INCIDENTS', progressNote.risksIncidents),
    section('MEDICATION ASSISTANCE', progressNote.medicationAssistance),
    section('NEXT STEPS', progressNote.nextSteps),
    section('ADDITIONAL SESSION DETAILS', progressNote.customPromptResponses),
    fields([
      ['If Overnight - Active Awake Hours', progressNote.activeHoursOvernight],
      ['Behaviours of Concern', progressNote.behaviorsOfConcern],
      ['How Shift Worked Toward Goal', progressNote.goalProgressDescription],
      ['Was Progress Made', progressNote.goalProgressOutcome],
      ['Mood and Emotional State', progressNote.moodEmotionalState],
      ['Physical Health Observations', progressNote.physicalHealthObservations],
      ['Appetite and Fluid Intake', progressNote.appetiteFluidIntake],
      ['Personal Hygiene and Grooming', progressNote.hygieneGrooming],
      ['Change from Usual Presentation', progressNote.presentationChanges],
    ]) && `SHIFT NOTE DETAILS\n\n${fields([
      ['If Overnight - Active Awake Hours', progressNote.activeHoursOvernight],
      ['Behaviours of Concern', progressNote.behaviorsOfConcern],
      ['How Shift Worked Toward Goal', progressNote.goalProgressDescription],
      ['Was Progress Made', progressNote.goalProgressOutcome],
      ['Mood and Emotional State', progressNote.moodEmotionalState],
      ['Physical Health Observations', progressNote.physicalHealthObservations],
      ['Appetite and Fluid Intake', progressNote.appetiteFluidIntake],
      ['Personal Hygiene and Grooming', progressNote.hygieneGrooming],
      ['Change from Usual Presentation', progressNote.presentationChanges],
    ])}`,
    (() => {
      const community = fields([
        ['Location(s) Visited and Purpose', progressNote.communityLocationPurpose],
        ['Duration of Outing', progressNote.communityDuration],
        ['Client Participation and Engagement', progressNote.communityParticipation],
        ['Transport Used', progressNote.transportUsed],
        ['Mileage Claim Submitted', progressNote.mileageClaimSubmitted],
      ]);
      return community ? `COMMUNITY ACCESS / ACTIVITIES\n\n${community}` : '';
    })(),
    (() => {
      const medication = fields([
        ['Medication Name and Dosage', progressNote.medicationNameDosage],
        ['Time Administered', progressNote.medicationTimeAdministered],
        ['Route of Administration', progressNote.medicationRoute],
        ["Client's Response / Observations", progressNote.medicationResponse],
        ['Medication Refused', progressNote.medicationRefusal],
      ]);
      return medication ? `MEDICATION\n\n${medication}` : '';
    })(),
    (() => {
      const incident = fields([
        ['Incident Occurred', progressNote.incidentOccurred],
        ['Incident Description', progressNote.incidentDescription],
        ['Supervisor Notified', progressNote.supervisorNotified],
        ['Incident Report Submitted in ShiftCare', progressNote.incidentReportSubmitted],
      ]);
      return incident ? `INCIDENTS, ACCIDENTS AND REPORTABLE EVENTS\n\n${incident}` : '';
    })(),
    fields([
      ['Tasks Not Completed and Reason', progressNote.tasksNotCompleted],
      ['Follow-Up Actions Required', progressNote.followUpActions],
      ['Handover / Information for Next Worker', progressNote.handoverNotes],
    ]) && `HANDOVER AND FOLLOW-UP\n\n${fields([
      ['Tasks Not Completed and Reason', progressNote.tasksNotCompleted],
      ['Follow-Up Actions Required', progressNote.followUpActions],
      ['Handover / Information for Next Worker', progressNote.handoverNotes],
    ])}`,
    (() => {
      const workerDetails = fields([
        ['Worker Name', progressNote.workerName],
        ['Signature', progressNote.workerSignature],
      ]);
      return workerDetails ? `WORKER DETAILS\n\n${workerDetails}` : '';
    })(),
  ].filter(Boolean);

  return `SUPPORT SESSION REPORT\n\n${reportParts.join('\n\n')}\n`;
}

/**
 * Check if NDIS Progress Note has missing required fields
 */
export function getIncompleteFields(progressNote: NDISProgressNote): string[] {
  const incomplete: string[] = [];
  
  const fieldsToCheck: { key: keyof NDISProgressNote; label: string }[] = [
    { key: 'participantName', label: 'Participant Name' },
    { key: 'date', label: 'Date' },
    { key: 'timeIn', label: 'Time In' },
    { key: 'timeOut', label: 'Time Out' },
    { key: 'location', label: 'Location' },
    { key: 'supportCategory', label: 'Support Category' },
    { key: 'goalsSupported', label: 'Goals Supported' },
    { key: 'workerName', label: 'Worker Name' },
  ];
  
  for (const field of fieldsToCheck) {
    const value = progressNote[field.key];
    if (!value || value.startsWith('[')) {
      incomplete.push(field.label);
    }
  }

  const hasSessionDetail = [
    progressNote.sessionTimeline,
    progressNote.sessionSummary,
    progressNote.activitiesCompleted,
    progressNote.observations,
  ].some(hasProgressNoteValue);
  if (!hasSessionDetail) incomplete.push('Session Notes or Summary');
  
  return incomplete;
}
