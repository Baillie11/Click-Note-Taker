import { IncidentReport } from '../types';
import { getDatabase, generateId } from './connection';
import { getCurrentISOTimestamp } from '../utils/dateTime';

/**
 * NOTE: This is a scaffold - functionality is not yet enabled
 * These functions are prepared for future implementation
 */

/**
 * Create a new incident report (scaffold - disabled)
 */
export async function createIncidentReport(
  clientId: string,
  data?: Partial<Omit<IncidentReport, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>>
): Promise<IncidentReport> {
  const db = await getDatabase();
  const now = getCurrentISOTimestamp();
  
  const report: IncidentReport = {
    id: generateId(),
    clientId,
    incidentDate: data?.incidentDate || now,
    incidentTime: data?.incidentTime || now,
    location: data?.location,
    description: data?.description,
    immediateActions: data?.immediateActions,
    reportedTo: data?.reportedTo,
    workerName: data?.workerName,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO incident_reports (
      id, clientId, incidentDate, incidentTime, location, description,
      immediateActions, reportedTo, workerName, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.id,
      report.clientId,
      report.incidentDate,
      report.incidentTime,
      report.location || null,
      report.description || null,
      report.immediateActions || null,
      report.reportedTo || null,
      report.workerName || null,
      report.createdAt,
      report.updatedAt,
    ]
  );

  return report;
}

/**
 * Get all incident reports for a client (scaffold)
 */
export async function getIncidentReportsByClientId(clientId: string): Promise<IncidentReport[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<IncidentReport>(
    'SELECT * FROM incident_reports WHERE clientId = ? ORDER BY incidentDate DESC',
    [clientId]
  );
  return result;
}

/**
 * Get incident report by ID (scaffold)
 */
export async function getIncidentReportById(id: string): Promise<IncidentReport | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<IncidentReport>(
    'SELECT * FROM incident_reports WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Update an incident report (scaffold)
 */
export async function updateIncidentReport(
  id: string,
  data: Partial<Omit<IncidentReport, 'id' | 'clientId' | 'createdAt'>>
): Promise<IncidentReport | null> {
  const db = await getDatabase();
  const now = getCurrentISOTimestamp();
  
  const existing = await getIncidentReportById(id);
  if (!existing) return null;

  const updated: IncidentReport = {
    ...existing,
    ...data,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE incident_reports SET
      incidentDate = ?, incidentTime = ?, location = ?, description = ?,
      immediateActions = ?, reportedTo = ?, workerName = ?, updatedAt = ?
     WHERE id = ?`,
    [
      updated.incidentDate,
      updated.incidentTime,
      updated.location || null,
      updated.description || null,
      updated.immediateActions || null,
      updated.reportedTo || null,
      updated.workerName || null,
      updated.updatedAt,
      id,
    ]
  );

  return updated;
}

/**
 * Delete an incident report (scaffold)
 */
export async function deleteIncidentReport(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM incident_reports WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Get incident reports count for a client (scaffold)
 */
export async function getIncidentReportsCountByClientId(clientId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM incident_reports WHERE clientId = ?',
    [clientId]
  );
  return result?.count || 0;
}
