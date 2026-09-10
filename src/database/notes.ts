import { Note } from '../types';
import { getDatabase, generateId } from './connection';
import { getCurrentISOTimestamp } from '../utils/dateTime';

/**
 * Create a new note
 */
export async function createNote(
  clientId: string,
  data?: Partial<Omit<Note, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>>
): Promise<Note> {
  const db = await getDatabase();
  const now = getCurrentISOTimestamp();
  
  const note: Note = {
    id: generateId(),
    clientId,
    // A finish time is data, not an explicit status change.
    status: data?.status || 'incomplete',
    rawContent: data?.rawContent || '',
    sessionEntries: data?.sessionEntries || '[]',
    audioUri: data?.audioUri,
    transcript: data?.transcript,
    timeIn: data?.timeIn || now,
    timeOut: data?.timeOut,
    location: data?.location,
    supportCategory: data?.supportCategory,
    goalsSupported: data?.goalsSupported,
    activitiesCompleted: data?.activitiesCompleted,
    observations: data?.observations,
    risksIncidents: data?.risksIncidents,
    medicationAssistance: data?.medicationAssistance,
    nextSteps: data?.nextSteps,
    customPromptResponses: data?.customPromptResponses || '[]',
    scheduledShiftEnd: data?.scheduledShiftEnd,
    reminderChecklist: data?.reminderChecklist || '[]',
    workerName: data?.workerName,
    workerSignature: data?.workerSignature,
    activeHoursOvernight: data?.activeHoursOvernight,
    behaviorsOfConcern: data?.behaviorsOfConcern,
    goalProgressDescription: data?.goalProgressDescription,
    goalProgressOutcome: data?.goalProgressOutcome,
    moodEmotionalState: data?.moodEmotionalState,
    physicalHealthObservations: data?.physicalHealthObservations,
    appetiteFluidIntake: data?.appetiteFluidIntake,
    hygieneGrooming: data?.hygieneGrooming,
    presentationChanges: data?.presentationChanges,
    communityLocationPurpose: data?.communityLocationPurpose,
    communityDuration: data?.communityDuration,
    communityParticipation: data?.communityParticipation,
    transportUsed: data?.transportUsed,
    mileageClaimSubmitted: data?.mileageClaimSubmitted,
    medicationNameDosage: data?.medicationNameDosage,
    medicationTimeAdministered: data?.medicationTimeAdministered,
    medicationRoute: data?.medicationRoute,
    medicationResponse: data?.medicationResponse,
    medicationRefusal: data?.medicationRefusal,
    incidentOccurred: data?.incidentOccurred,
    incidentDescription: data?.incidentDescription,
    supervisorNotified: data?.supervisorNotified,
    incidentReportSubmitted: data?.incidentReportSubmitted,
    tasksNotCompleted: data?.tasksNotCompleted,
    followUpActions: data?.followUpActions,
    handoverNotes: data?.handoverNotes,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO notes (
      id, clientId, rawContent, sessionEntries, audioUri, transcript, timeIn, timeOut,
      location, supportCategory, goalsSupported, activitiesCompleted,
      observations, risksIncidents, medicationAssistance, nextSteps,
      workerName, workerSignature, customPromptResponses, scheduledShiftEnd, reminderChecklist, status,
      activeHoursOvernight, behaviorsOfConcern, goalProgressDescription, goalProgressOutcome,
      moodEmotionalState, physicalHealthObservations, appetiteFluidIntake, hygieneGrooming, presentationChanges,
      communityLocationPurpose, communityDuration, communityParticipation, transportUsed, mileageClaimSubmitted,
      medicationNameDosage, medicationTimeAdministered, medicationRoute, medicationResponse, medicationRefusal,
      incidentOccurred, incidentDescription, supervisorNotified, incidentReportSubmitted,
      tasksNotCompleted, followUpActions, handoverNotes,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.clientId,
      note.rawContent,
      note.sessionEntries || '[]',
      note.audioUri || null,
      note.transcript || null,
      note.timeIn,
      note.timeOut || null,
      note.location || null,
      note.supportCategory || null,
      note.goalsSupported || null,
      note.activitiesCompleted || null,
      note.observations || null,
      note.risksIncidents || null,
      note.medicationAssistance || null,
      note.nextSteps || null,
      note.workerName || null,
      note.workerSignature || null,
      note.customPromptResponses || '[]',
      note.scheduledShiftEnd || null,
      note.reminderChecklist || '[]',
      note.status,
      note.activeHoursOvernight || null,
      note.behaviorsOfConcern || null,
      note.goalProgressDescription || null,
      note.goalProgressOutcome || null,
      note.moodEmotionalState || null,
      note.physicalHealthObservations || null,
      note.appetiteFluidIntake || null,
      note.hygieneGrooming || null,
      note.presentationChanges || null,
      note.communityLocationPurpose || null,
      note.communityDuration || null,
      note.communityParticipation || null,
      note.transportUsed || null,
      note.mileageClaimSubmitted || null,
      note.medicationNameDosage || null,
      note.medicationTimeAdministered || null,
      note.medicationRoute || null,
      note.medicationResponse || null,
      note.medicationRefusal || null,
      note.incidentOccurred || null,
      note.incidentDescription || null,
      note.supervisorNotified || null,
      note.incidentReportSubmitted || null,
      note.tasksNotCompleted || null,
      note.followUpActions || null,
      note.handoverNotes || null,
      note.createdAt,
      note.updatedAt,
    ]
  );

  return note;
}

/**
 * Get all notes for a client
 */
export async function getNotesByClientId(clientId: string): Promise<Note[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Note>(
    'SELECT * FROM notes WHERE clientId = ? ORDER BY timeIn DESC',
    [clientId]
  );
  return result;
}

/**
 * Get note by ID
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Note>(
    'SELECT * FROM notes WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Update a note
 */
export async function updateNote(
  id: string,
  data: Partial<Omit<Note, 'id' | 'clientId' | 'createdAt'>>
): Promise<Note | null> {
  const db = await getDatabase();
  const now = getCurrentISOTimestamp();
  
  const existing = await getNoteById(id);
  if (!existing) return null;

  const updated: Note = {
    ...existing,
    ...data,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE notes SET
      rawContent = ?, sessionEntries = ?, audioUri = ?, transcript = ?, timeIn = ?, timeOut = ?,
      location = ?, supportCategory = ?, goalsSupported = ?, activitiesCompleted = ?,
      observations = ?, risksIncidents = ?, medicationAssistance = ?, nextSteps = ?,
      workerName = ?, workerSignature = ?, customPromptResponses = ?, scheduledShiftEnd = ?, reminderChecklist = ?, status = ?,
      activeHoursOvernight = ?, behaviorsOfConcern = ?, goalProgressDescription = ?, goalProgressOutcome = ?,
      moodEmotionalState = ?, physicalHealthObservations = ?, appetiteFluidIntake = ?, hygieneGrooming = ?, presentationChanges = ?,
      communityLocationPurpose = ?, communityDuration = ?, communityParticipation = ?, transportUsed = ?, mileageClaimSubmitted = ?,
      medicationNameDosage = ?, medicationTimeAdministered = ?, medicationRoute = ?, medicationResponse = ?, medicationRefusal = ?,
      incidentOccurred = ?, incidentDescription = ?, supervisorNotified = ?, incidentReportSubmitted = ?,
      tasksNotCompleted = ?, followUpActions = ?, handoverNotes = ?,
      updatedAt = ?
     WHERE id = ?`,
    [
      updated.rawContent,
      updated.sessionEntries || '[]',
      updated.audioUri || null,
      updated.transcript || null,
      updated.timeIn,
      updated.timeOut || null,
      updated.location || null,
      updated.supportCategory || null,
      updated.goalsSupported || null,
      updated.activitiesCompleted || null,
      updated.observations || null,
      updated.risksIncidents || null,
      updated.medicationAssistance || null,
      updated.nextSteps || null,
      updated.workerName || null,
      updated.workerSignature || null,
      updated.customPromptResponses || '[]',
      updated.scheduledShiftEnd || null,
      updated.reminderChecklist || '[]',
      updated.status,
      updated.activeHoursOvernight || null,
      updated.behaviorsOfConcern || null,
      updated.goalProgressDescription || null,
      updated.goalProgressOutcome || null,
      updated.moodEmotionalState || null,
      updated.physicalHealthObservations || null,
      updated.appetiteFluidIntake || null,
      updated.hygieneGrooming || null,
      updated.presentationChanges || null,
      updated.communityLocationPurpose || null,
      updated.communityDuration || null,
      updated.communityParticipation || null,
      updated.transportUsed || null,
      updated.mileageClaimSubmitted || null,
      updated.medicationNameDosage || null,
      updated.medicationTimeAdministered || null,
      updated.medicationRoute || null,
      updated.medicationResponse || null,
      updated.medicationRefusal || null,
      updated.incidentOccurred || null,
      updated.incidentDescription || null,
      updated.supervisorNotified || null,
      updated.incidentReportSubmitted || null,
      updated.tasksNotCompleted || null,
      updated.followUpActions || null,
      updated.handoverNotes || null,
      updated.updatedAt,
      id,
    ]
  );

  return updated;
}

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Get notes count for a client
 */
export async function getNotesCountByClientId(clientId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM notes WHERE clientId = ?',
    [clientId]
  );
  return result?.count || 0;
}

/**
 * Get notes that are still open for a client.
 */
export async function getOpenNotesCountByClientId(clientId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM notes
     WHERE clientId = ? AND (status IS NULL OR status != 'submitted')`,
    [clientId]
  );
  return result?.count || 0;
}

/**
 * Get recent notes across all clients
 */
export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Note>(
    'SELECT * FROM notes ORDER BY updatedAt DESC LIMIT ?',
    [limit]
  );
  return result;
}

/**
 * Get finished shifts whose start time falls within a pay period.
 */
export async function getCompletedNotesBetween(start: string, end: string): Promise<Note[]> {
  const db = await getDatabase();
  return db.getAllAsync<Note>(
    `SELECT * FROM notes
     WHERE timeOut IS NOT NULL
       AND status IN ('completed', 'submitted')
       AND timeIn >= ? AND timeIn < ?
     ORDER BY timeIn ASC`,
    [start, end]
  );
}
