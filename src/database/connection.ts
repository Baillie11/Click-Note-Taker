import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize and get database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('clicknotetaker.db');
    await runMigrations(db);
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function clearDatabaseRecords(): Promise<string[]> {
  const database = await getDatabase();
  const recordings = await database.getAllAsync<{ audioUri: string | null }>(
    'SELECT audioUri FROM notes WHERE audioUri IS NOT NULL'
  );

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM incident_reports');
    await database.runAsync('DELETE FROM notes');
    await database.runAsync('DELETE FROM clients');
  });

  return recordings.flatMap(({ audioUri }) => audioUri ? [audioUri] : []);
}

/**
 * Generate UUID
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
