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
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO notes (
      id, clientId, rawContent, sessionEntries, audioUri, transcript, timeIn, timeOut,
      location, supportCategory, goalsSupported, activitiesCompleted,
      observations, risksIncidents, medicationAssistance, nextSteps,
      workerName, workerSignature, customPromptResponses, scheduledShiftEnd, reminderChecklist, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      workerName = ?, workerSignature = ?, customPromptResponses = ?, scheduledShiftEnd = ?, reminderChecklist = ?, status = ?, updatedAt = ?
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
