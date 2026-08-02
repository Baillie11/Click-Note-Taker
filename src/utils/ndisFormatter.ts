import { Note, Client, NDISProgressNote } from '../types';
import { formatAustralianDate, formatAustralianTime } from './dateTime';

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
    location: note.location || '[Add location]',
    supportCategory: note.supportCategory || '[Select support category]',
    goalsSupported: note.goalsSupported || '[Add goals supported]',
    activitiesCompleted: note.activitiesCompleted || extractActivities(note.rawContent),
    observations: note.observations || extractObservations(note.rawContent),
    risksIncidents: note.risksIncidents || '[No risks/incidents reported]',
    medicationAssistance: note.medicationAssistance || '[N/A or add details]',
    nextSteps: note.nextSteps || '[Add recommendations]',
    workerName: note.workerName || '[Add worker name]',
    workerSignature: note.workerSignature || '[Add signature]',
  };
}

/**
 * Extract activities from raw content (basic extraction, returns placeholder if insufficient)
 */
function extractActivities(rawContent: string): string {
  if (!rawContent || rawContent.trim().length < 10) {
    return '[Add activities completed]';
  }
  
  // If raw content exists, return it as the base for activities
  // Don't fabricate - let the user refine
  return rawContent.trim() || '[Add activities completed]';
}

/**
 * Extract observations from raw content (basic extraction, returns placeholder if insufficient)
 */
function extractObservations(rawContent: string): string {
  if (!rawContent || rawContent.trim().length < 10) {
    return '[Add observations / participant response]';
  }
  return '[Add observations based on session]';
}

/**
 * Format NDIS Progress Note as plain text for copying/sharing
 */
export function formatNDISProgressNoteAsText(progressNote: NDISProgressNote): string {
  return `NDIS PROGRESS NOTE
==================

Participant Name: ${progressNote.participantName}
Date: ${progressNote.date}
Time In: ${progressNote.timeIn}
Time Out: ${progressNote.timeOut}
Location: ${progressNote.location}

SUPPORT DETAILS
---------------
Support Category: ${progressNote.supportCategory}
Goals Supported: ${progressNote.goalsSupported}

ACTIVITIES COMPLETED
--------------------
${progressNote.activitiesCompleted}

OBSERVATIONS / PARTICIPANT RESPONSE
-----------------------------------
${progressNote.observations}

RISKS / INCIDENTS
-----------------
${progressNote.risksIncidents}

MEDICATION ASSISTANCE
---------------------
${progressNote.medicationAssistance}

NEXT STEPS / RECOMMENDATIONS
----------------------------
${progressNote.nextSteps}

WORKER DETAILS
--------------
Worker Name: ${progressNote.workerName}
Signature: ${progressNote.workerSignature}
`;
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
    { key: 'activitiesCompleted', label: 'Activities Completed' },
    { key: 'observations', label: 'Observations' },
    { key: 'workerName', label: 'Worker Name' },
  ];
  
  for (const field of fieldsToCheck) {
    const value = progressNote[field.key];
    if (!value || value.startsWith('[')) {
      incomplete.push(field.label);
    }
  }
  
  return incomplete;
}
