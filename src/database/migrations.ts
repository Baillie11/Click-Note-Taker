import * as SQLite from 'expo-sqlite/next';

const MIGRATIONS = [
  {
    version: 1,
    up: `
      -- Clients table
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY NOT NULL,
        fullName TEXT NOT NULL,
        preferredName TEXT,
        ndisNumber TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        clientId TEXT NOT NULL,
        rawContent TEXT NOT NULL DEFAULT '',
        audioUri TEXT,
        transcript TEXT,
        timeIn TEXT NOT NULL,
        timeOut TEXT,
        location TEXT,
        supportCategory TEXT,
        goalsSupported TEXT,
        activitiesCompleted TEXT,
        observations TEXT,
        risksIncidents TEXT,
        medicationAssistance TEXT,
        nextSteps TEXT,
        workerName TEXT,
        workerSignature TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
      );

      -- Incident Reports table (scaffold)
      CREATE TABLE IF NOT EXISTS incident_reports (
        id TEXT PRIMARY KEY NOT NULL,
        clientId TEXT NOT NULL,
        incidentDate TEXT NOT NULL,
        incidentTime TEXT NOT NULL,
        location TEXT,
        description TEXT,
        immediateActions TEXT,
        reportedTo TEXT,
        workerName TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
      );

      -- Indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_notes_clientId ON notes(clientId);
      CREATE INDEX IF NOT EXISTS idx_incident_reports_clientId ON incident_reports(clientId);
      CREATE INDEX IF NOT EXISTS idx_notes_timeIn ON notes(timeIn);
    `,
  },
  {
    version: 2,
    up: `
      ALTER TABLE notes ADD COLUMN status TEXT NOT NULL DEFAULT 'incomplete';

      CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
    `,
  },
  {
    version: 3,
    up: `
      -- Version 2 previously inferred completion from timeOut. Reset those
      -- inferred values so completion requires an explicit user action.
      UPDATE notes
      SET status = 'incomplete'
      WHERE status = 'completed';
    `,
  },
  {
    version: 4,
    up: `
      ALTER TABLE notes ADD COLUMN sessionEntries TEXT NOT NULL DEFAULT '[]';
    `,
  },
  {
    version: 5,
    up: `
      ALTER TABLE clients ADD COLUMN address TEXT;
    `,
  },
  {
    version: 6,
    up: `
      ALTER TABLE clients ADD COLUMN sessionSummaryPromptIds TEXT NOT NULL DEFAULT '[]';
    `,
  },
];

/**
 * Run database migrations
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      appliedAt TEXT NOT NULL
    );
  `);

  // Get current migration version
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM migrations'
  );
  const currentVersion = result?.version || 0;

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration version ${migration.version}`);
      
      await db.execAsync(migration.up);
      
      await db.runAsync(
        'INSERT INTO migrations (version, appliedAt) VALUES (?, ?)',
        [migration.version, new Date().toISOString()]
      );
      
      console.log(`Migration version ${migration.version} applied successfully`);
    }
  }
}

/**
 * Get current migration version
 */
export async function getCurrentMigrationVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM migrations'
  );
  return result?.version || 0;
}
