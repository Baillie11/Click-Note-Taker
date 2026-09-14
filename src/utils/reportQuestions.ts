import { Note } from '../types';

export type ReportAnswerKind = 'text' | 'yes_no' | 'yes_no_na';
export type ReportAnswerStatus = 'unanswered' | 'drafted' | 'confirmed';

export interface ReportQuestion {
  id: string;
  title: string;
  prompt: string;
  field: keyof Note;
  kind: ReportAnswerKind;
  required: boolean;
  condition?: (note: Note, state: ReportAssistantState) => boolean;
}

export interface ReportAssistantState {
  statuses: Record<string, ReportAnswerStatus>;
  decisions: Record<string, string>;
  generatedAt?: string;
}

const isYes = (value?: string) => value?.trim().toLowerCase() === 'yes';
const hasText = (value?: string) => Boolean(value?.trim());

export const REPORT_QUESTIONS: ReportQuestion[] = [
  { id: 'shift-times', title: 'Shift Times', prompt: 'Confirm the actual shift start and end time.', field: 'timeOut', kind: 'text', required: true },
  { id: 'overnight-gate', title: 'Overnight Support', prompt: 'Did this shift include overnight support?', field: 'activeHoursOvernight', kind: 'yes_no_na', required: true },
  { id: 'overnight-hours', title: 'Active Overnight Hours', prompt: 'Document any active awake hours overnight.', field: 'activeHoursOvernight', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['overnight-gate']) },
  { id: 'behaviours-gate', title: 'Behaviours of Concern', prompt: 'Were any behaviours of concern observed during this shift?', field: 'behaviorsOfConcern', kind: 'yes_no', required: true },
  { id: 'behaviours-detail', title: 'Behaviour Details', prompt: 'Describe only observable behaviours, context, actions taken, and outcome.', field: 'behaviorsOfConcern', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['behaviours-gate']) },
  { id: 'goals', title: 'Goals Supported', prompt: 'Which Support Plan goal or goals were worked toward?', field: 'goalsSupported', kind: 'text', required: true },
  { id: 'goal-actions', title: 'Working Toward Goals', prompt: 'Describe how the shift worked toward the selected goals.', field: 'goalProgressDescription', kind: 'text', required: true },
  { id: 'goal-progress', title: 'Goal Progress', prompt: 'Was progress made? Describe specifically, or explain why not.', field: 'goalProgressOutcome', kind: 'text', required: true },
  { id: 'supports', title: 'Supports Delivered', prompt: 'Give a clear, factual, chronological account of supports delivered, their order, and assistance level.', field: 'activitiesCompleted', kind: 'text', required: true },
  { id: 'mood', title: 'Mood and Emotional State', prompt: 'Describe observable mood and emotional state without diagnosis or assumptions.', field: 'moodEmotionalState', kind: 'text', required: true },
  { id: 'health', title: 'Physical Health', prompt: 'Record relevant observations of appearance, mobility, skin, pain, and any changes.', field: 'physicalHealthObservations', kind: 'text', required: true },
  { id: 'appetite-gate', title: 'Food and Fluids', prompt: 'Was appetite or fluid intake relevant to the care plan, or was any change observed?', field: 'appetiteFluidIntake', kind: 'yes_no_na', required: true },
  { id: 'appetite-detail', title: 'Appetite and Fluid Intake', prompt: 'Describe appetite, fluid intake, or the observed change.', field: 'appetiteFluidIntake', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['appetite-gate']) },
  { id: 'hygiene', title: 'Personal Care', prompt: 'Describe personal hygiene and grooming completed during the shift.', field: 'hygieneGrooming', kind: 'text', required: true },
  { id: 'presentation', title: 'Changes in Presentation', prompt: "Record any change from the client's usual presentation that the next worker should know. Enter No change if none.", field: 'presentationChanges', kind: 'text', required: true },
  { id: 'community-gate', title: 'Community Access', prompt: 'Did this shift include activities outside the home?', field: 'communityLocationPurpose', kind: 'yes_no', required: true },
  { id: 'community-location', title: 'Locations and Purpose', prompt: 'List locations visited and the purpose of the outing.', field: 'communityLocationPurpose', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['community-gate']) },
  { id: 'community-duration', title: 'Outing Duration', prompt: 'How long did the outing last?', field: 'communityDuration', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['community-gate']) },
  { id: 'community-participation', title: 'Participation and Engagement', prompt: "Describe the client's participation and engagement.", field: 'communityParticipation', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['community-gate']) },
  { id: 'transport', title: 'Transport Used', prompt: "Record Own vehicle, Public transport, Client's vehicle, or N/A.", field: 'transportUsed', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['community-gate']) },
  { id: 'mileage', title: 'Mileage Claim', prompt: 'If your own vehicle was used, was a mileage claim submitted?', field: 'mileageClaimSubmitted', kind: 'yes_no_na', required: true, condition: note => note.transportUsed?.toLowerCase().includes('own vehicle') ?? false },
  { id: 'medication-gate', title: 'Medication', prompt: 'Was medication administration part of this shift?', field: 'medicationNameDosage', kind: 'yes_no', required: true },
  { id: 'medication-name', title: 'Medication Details', prompt: 'Record medication name and dosage.', field: 'medicationNameDosage', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['medication-gate']) },
  { id: 'medication-time', title: 'Medication Time', prompt: 'Record the time medication was administered.', field: 'medicationTimeAdministered', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['medication-gate']) },
  { id: 'medication-route', title: 'Administration Route', prompt: 'Record the route of administration.', field: 'medicationRoute', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['medication-gate']) },
  { id: 'medication-response', title: 'Medication Response', prompt: 'Record the client response and any observations.', field: 'medicationResponse', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['medication-gate']) },
  { id: 'medication-refusal', title: 'Medication Refusal', prompt: 'Did the client refuse medication? If yes, record their words.', field: 'medicationRefusal', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['medication-gate']) },
  { id: 'incident', title: 'Incidents', prompt: 'Did any incident, accident, near miss, or reportable event occur?', field: 'incidentOccurred', kind: 'yes_no', required: true },
  { id: 'incident-detail', title: 'Incident Details', prompt: 'Describe exactly what happened, when, who was present, and actions taken.', field: 'incidentDescription', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions.incident) },
  { id: 'supervisor', title: 'Supervisor Notification', prompt: 'Was a supervisor notified? If yes, record their name and the contact time.', field: 'supervisorNotified', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions.incident) },
  { id: 'incident-report', title: 'Separate Incident Report', prompt: 'Was an Incident Report submitted separately in ShiftCare?', field: 'incidentReportSubmitted', kind: 'yes_no_na', required: true, condition: (_note, state) => isYes(state.decisions.incident) },
  { id: 'tasks', title: 'Unfinished Tasks', prompt: 'Were any tasks not completed this shift?', field: 'tasksNotCompleted', kind: 'yes_no', required: true },
  { id: 'tasks-detail', title: 'Unfinished Task Details', prompt: 'List tasks not completed and the reason.', field: 'tasksNotCompleted', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions.tasks) },
  { id: 'follow-up', title: 'Follow-Up Actions', prompt: 'Are any follow-up actions required?', field: 'followUpActions', kind: 'yes_no', required: true },
  { id: 'follow-up-detail', title: 'Follow-Up Details', prompt: 'List required appointments, purchases, contacts, or escalations.', field: 'followUpActions', kind: 'text', required: true, condition: (_note, state) => isYes(state.decisions['follow-up']) },
  { id: 'handover', title: 'Handover', prompt: 'Record anything the next worker or management needs to know. Enter Nothing further if none.', field: 'handoverNotes', kind: 'text', required: true },
];

export function parseReportState(value?: string): ReportAssistantState {
  try {
    const parsed = JSON.parse(value || '{}');
    return { statuses: parsed.statuses || {}, decisions: parsed.decisions || {}, generatedAt: parsed.generatedAt };
  } catch {
    return { statuses: {}, decisions: {} };
  }
}

export function activeReportQuestions(note: Note, state: ReportAssistantState): ReportQuestion[] {
  return REPORT_QUESTIONS.filter(question => !question.condition || question.condition(note, state));
}

export function isQuestionAnswered(note: Note, question: ReportQuestion): boolean {
  if (question.id === 'shift-times') return hasText(note.timeIn) && hasText(note.timeOut);
  return hasText(String(note[question.field] || ''));
}

export function reportProgress(note: Note, state: ReportAssistantState) {
  const active = activeReportQuestions(note, state);
  const confirmed = active.filter(question => state.statuses[question.id] === 'confirmed' && (question.kind !== 'text' ? Boolean(state.decisions[question.id]) : isQuestionAnswered(note, question))).length;
  return { confirmed, total: active.length, complete: confirmed === active.length };
}
