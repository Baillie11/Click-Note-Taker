import * as SQLite from 'expo-sqlite';

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
  {
    version: 7,
    up: `
      ALTER TABLE clients ADD COLUMN customSessionSummaryPrompts TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE notes ADD COLUMN customPromptResponses TEXT NOT NULL DEFAULT '[]';
    `,
  },
  {
    version: 8,
    up: `
      ALTER TABLE clients ADD COLUMN shifts TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE notes ADD COLUMN scheduledShiftEnd TEXT;
    `,
  },
  {
    version: 9,
    up: `
      ALTER TABLE clients ADD COLUMN reminderItemIds TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE clients ADD COLUMN customReminderItems TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE notes ADD COLUMN reminderChecklist TEXT NOT NULL DEFAULT '[]';
    `,
  },
  {
    version: 10,
    up: `
      ALTER TABLE clients ADD COLUMN clientGoals TEXT NOT NULL DEFAULT '[]';
    `,
  },
  {
    version: 11,
    up: `
      ALTER TABLE notes ADD COLUMN activeHoursOvernight TEXT;
      ALTER TABLE notes ADD COLUMN behaviorsOfConcern TEXT;
      ALTER TABLE notes ADD COLUMN goalProgressDescription TEXT;
      ALTER TABLE notes ADD COLUMN goalProgressOutcome TEXT;
      ALTER TABLE notes ADD COLUMN moodEmotionalState TEXT;
      ALTER TABLE notes ADD COLUMN physicalHealthObservations TEXT;
      ALTER TABLE notes ADD COLUMN appetiteFluidIntake TEXT;
      ALTER TABLE notes ADD COLUMN hygieneGrooming TEXT;
      ALTER TABLE notes ADD COLUMN presentationChanges TEXT;
      ALTER TABLE notes ADD COLUMN communityLocationPurpose TEXT;
      ALTER TABLE notes ADD COLUMN communityDuration TEXT;
      ALTER TABLE notes ADD COLUMN communityParticipation TEXT;
      ALTER TABLE notes ADD COLUMN transportUsed TEXT;
      ALTER TABLE notes ADD COLUMN mileageClaimSubmitted TEXT;
      ALTER TABLE notes ADD COLUMN medicationNameDosage TEXT;
      ALTER TABLE notes ADD COLUMN medicationTimeAdministered TEXT;
      ALTER TABLE notes ADD COLUMN medicationRoute TEXT;
      ALTER TABLE notes ADD COLUMN medicationResponse TEXT;
      ALTER TABLE notes ADD COLUMN medicationRefusal TEXT;
      ALTER TABLE notes ADD COLUMN incidentOccurred TEXT;
      ALTER TABLE notes ADD COLUMN incidentDescription TEXT;
      ALTER TABLE notes ADD COLUMN supervisorNotified TEXT;
      ALTER TABLE notes ADD COLUMN incidentReportSubmitted TEXT;
      ALTER TABLE notes ADD COLUMN tasksNotCompleted TEXT;
      ALTER TABLE notes ADD COLUMN followUpActions TEXT;
      ALTER TABLE notes ADD COLUMN handoverNotes TEXT;
    `,
  },
  {
    version: 12,
    up: `
      ALTER TABLE notes ADD COLUMN reportAssistantState TEXT NOT NULL DEFAULT '{}';
    `,
  },
  {
    version: 13,
    up: `
      ALTER TABLE notes ADD COLUMN liveEntryDraft TEXT NOT NULL DEFAULT '';
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
