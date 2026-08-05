// Client entity
export interface Client {
  id: string;
  fullName: string;
  preferredName?: string;
  ndisNumber?: string;
  address?: string;
  sessionSummaryPromptIds?: string;
  customSessionSummaryPrompts?: string;
  shifts?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NoteStatus = 'incomplete' | 'completed' | 'submitted';

export interface SessionEntry {
  id: string;
  timestamp: string;
  text: string;
}

export interface CustomSessionSummaryPrompt {
  id: string;
  question: string;
}

export interface CustomPromptResponse extends CustomSessionSummaryPrompt {
  response: string;
}

export interface ClientShift {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

// Note entity
export interface Note {
  id: string;
  clientId: string;
  status: NoteStatus;
  rawContent: string;
  sessionEntries?: string;
  audioUri?: string;
  transcript?: string;
  timeIn: string;
  timeOut?: string;
  location?: string;
  supportCategory?: string;
  goalsSupported?: string;
  activitiesCompleted?: string;
  observations?: string;
  risksIncidents?: string;
  medicationAssistance?: string;
  nextSteps?: string;
  customPromptResponses?: string;
  scheduledShiftEnd?: string;
  workerName?: string;
  workerSignature?: string;
  createdAt: string;
  updatedAt: string;
}

// Incident Report entity (scaffold)
export interface IncidentReport {
  id: string;
  clientId: string;
  incidentDate: string;
  incidentTime: string;
  location?: string;
  description?: string;
  immediateActions?: string;
  reportedTo?: string;
  workerName?: string;
  createdAt: string;
  updatedAt: string;
}

// NDIS Support Categories
export const SUPPORT_CATEGORIES = [
  'Community Access',
  'Personal Care',
  'Assist Daily Living',
  'Transport',
  'Consumables',
  'Assistance with Social & Community Participation',
  'Assistive Technology',
  'Home Modifications',
  'Coordination of Supports',
  'Improved Living Arrangements',
  'Increased Social & Community Participation',
  'Finding & Keeping a Job',
  'Improved Relationships',
  'Improved Health & Wellbeing',
  'Improved Learning',
  'Improved Life Choices',
  'Improved Daily Living Skills',
] as const;

export type SupportCategory = typeof SUPPORT_CATEGORIES[number];

// NDIS Progress Note structure
export interface NDISProgressNote {
  participantName: string;
  date: string;
  timeIn: string;
  timeOut: string;
  duration: string;
  location: string;
  supportCategory: string;
  goalsSupported: string;
  sessionSummary: string;
  activitiesCompleted: string;
  sessionTimeline: string;
  observations: string;
  risksIncidents: string;
  medicationAssistance: string;
  nextSteps: string;
  customPromptResponses: string;
  workerName: string;
  workerSignature: string;
}

// Navigation types
export type RootStackParamList = {
  PinSetup: undefined;
  Unlock: undefined;
  MainTabs: undefined;
  ClientDetail: { clientId: string };
  NoteEditor: { clientId: string; noteId?: string };
  IncidentReportsList: { clientId: string };
  IncidentReportEditor: { clientId: string; reportId?: string };
};

export type MainTabParamList = {
  Clients: undefined;
  Settings: undefined;
};

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  isPinSet: boolean;
  isLoading: boolean;
}

// Settings
export interface AppSettings {
  biometricsEnabled: boolean;
  gracePeriodEnabled: boolean;
  gracePeriodMinutes: number;
}

// User profile defaults
export interface UserProfile {
  workerName: string;
  workerSignature?: string;
  roleTitle?: string;
  organization?: string;
  defaultLocation?: string;
  providerNumber?: string;
}
