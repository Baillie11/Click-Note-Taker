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
