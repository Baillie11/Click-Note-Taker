import { CustomPromptResponse, CustomSessionSummaryPrompt } from '../types';

export const SESSION_SUMMARY_PROMPTS = [
  {
    id: 'supports',
    question: 'What supports and activities were provided?',
    placeholder: 'Activities, choices, routines, or skills practised',
  },
  {
    id: 'engagement',
    question: 'How did the client present and engage?',
    placeholder: 'Presentation, communication, mood, participation, and strengths',
  },
  {
    id: 'changes',
    question: 'Were there any changes, concerns, or incidents?',
    placeholder: 'Changes to health, behaviour, routine, risks, or incidents',
  },
  {
    id: 'handover',
    question: 'What should the next worker know or follow up?',
    placeholder: 'Handover details, appointments, preferences, or follow-up actions',
  },
] as const;

export type SessionSummaryPromptId = typeof SESSION_SUMMARY_PROMPTS[number]['id'];

const VALID_PROMPT_IDS = new Set<string>(SESSION_SUMMARY_PROMPTS.map((prompt) => prompt.id));

export function parseSessionSummaryPromptIds(value?: string): SessionSummaryPromptId[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is SessionSummaryPromptId => typeof id === 'string' && VALID_PROMPT_IDS.has(id)
    );
  } catch {
    return [];
  }
}

export function serializeSessionSummaryPromptIds(ids: SessionSummaryPromptId[]): string {
  return JSON.stringify(ids);
}

export function parseCustomPrompts(value?: string): CustomSessionSummaryPrompt[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((prompt): prompt is CustomSessionSummaryPrompt =>
      typeof prompt?.id === 'string' && typeof prompt?.question === 'string' && !!prompt.question.trim()
    );
  } catch {
    return [];
  }
}

export function serializeCustomPrompts(prompts: CustomSessionSummaryPrompt[]): string {
  return JSON.stringify(prompts);
}

export function parseCustomPromptResponses(value?: string): CustomPromptResponse[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CustomPromptResponse =>
      typeof item?.id === 'string' && typeof item?.question === 'string' && typeof item?.response === 'string'
    );
  } catch {
    return [];
  }
}

export function serializeCustomPromptResponses(responses: CustomPromptResponse[]): string {
  return JSON.stringify(responses);
}
