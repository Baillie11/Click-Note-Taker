import { Client } from '../types';
import { getDatabase, generateId } from './connection';
import { getCurrentISOTimestamp } from '../utils/dateTime';

/**
 * Create a new client
 */
export async function createClient(
  data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Client> {
  const db = await getDatabase();
  const now = getCurrentISOTimestamp();
  
  const client: Client = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO clients (id, fullName, preferredName, ndisNumber, address, sessionSummaryPromptIds, customSessionSummaryPrompts, shifts, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client.id,
      client.fullName,
      client.preferredName || null,
      client.ndisNumber || null,
      client.address || null,
      client.sessionSummaryPromptIds || '[]',
      client.customSessionSummaryPrompts || '[]',
      client.shifts || '[]',
      client.notes || null,
      client.createdAt,
      client.updatedAt,
    ]
  );

  return client;
}

/**
 * Get all clients
 */
export async function getAllClients(): Promise<Client[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Client>(
    'SELECT * FROM clients ORDER BY fullName ASC'
  );
  return result;
}

/**
 * Get client by ID
 */
export async function getClientById(id: string): Promise<Client | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Client>(
    'SELECT * FROM clients WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Update a client
 */
export async function updateClient(
  id: string,
  data: Partial<Omit<Client, 'id' | 'createdAt'>>
): Promise<Client | null> {
  const db = await getDatabase();
  const now = getCurrentISOTimestamp();
  
  const existing = await getClientById(id);
  if (!existing) return null;

  const updated: Client = {
    ...existing,
    ...data,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE clients 
     SET fullName = ?, preferredName = ?, ndisNumber = ?, address = ?, sessionSummaryPromptIds = ?, customSessionSummaryPrompts = ?, shifts = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
    [
      updated.fullName,
      updated.preferredName || null,
      updated.ndisNumber || null,
      updated.address || null,
      updated.sessionSummaryPromptIds || '[]',
      updated.customSessionSummaryPrompts || '[]',
      updated.shifts || '[]',
      updated.notes || null,
      updated.updatedAt,
      id,
    ]
  );

  return updated;
}

/**
 * Delete a client (cascades to notes)
 */
export async function deleteClient(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Search clients by name
 */
export async function searchClients(query: string): Promise<Client[]> {
  const db = await getDatabase();
  const searchTerm = `%${query}%`;
  const result = await db.getAllAsync<Client>(
    `SELECT * FROM clients 
     WHERE fullName LIKE ? OR preferredName LIKE ? OR ndisNumber LIKE ? OR address LIKE ?
     ORDER BY fullName ASC`,
    [searchTerm, searchTerm, searchTerm, searchTerm]
  );
  return result;
}

/**
 * Get client count
 */
export async function getClientCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM clients'
  );
  return result?.count || 0;
}
