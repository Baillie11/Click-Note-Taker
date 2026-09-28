import { REPORT_ASSISTANT_URL } from '../constants';
import { Note, SessionEntry } from '../types';
import { getAiAccessCode } from '../utils/aiAccess';
import { ReportQuestion } from '../utils/reportQuestions';

export interface AiDraft { questionId: string; answer: string; }

function parseEntries(value?: string): SessionEntry[] {
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

export async function requestReportDrafts(note: Note, questions: ReportQuestion[]): Promise<AiDraft[]> {
  const accessCode = await getAiAccessCode();
  if (!accessCode) throw new Error('Add your AI access code in Settings first.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(REPORT_ASSISTANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Click-Note-Access': accessCode },
      signal: controller.signal,
      body: JSON.stringify({
        shift: { timeIn: note.timeIn, timeOut: note.timeOut, supportCategory: note.supportCategory },
        evidence: {
          liveNotes: parseEntries(note.sessionEntries).map(entry => ({ timestamp: entry.timestamp, text: entry.text })),
          summary: note.rawContent,
          observations: note.observations,
          risksIncidents: note.risksIncidents,
          medicationAssistance: note.medicationAssistance,
          nextSteps: note.nextSteps,
          selectedGoals: note.goalsSupported,
        },
        questions: questions.map(question => ({
          id: question.id,
          prompt: question.id === 'goal-actions'
            ? `${question.prompt}\nSelected goal(s): ${note.goalsSupported || 'Not supplied'}`
            : question.id === 'goal-progress'
              ? `${question.prompt}\nSelected goal(s): ${note.goalsSupported || 'Not supplied'}\nHow the shift worked toward the goal: ${note.goalProgressDescription || 'Not supplied'}`
              : question.prompt,
          currentAnswer: String(note[question.field] || ''),
          answerType: question.kind,
        })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'AI assistance is unavailable right now.');
    if (!Array.isArray(data.answers)) throw new Error('The AI response was not in the expected format.');
    return data.answers.filter((item: AiDraft) => typeof item?.questionId === 'string' && typeof item?.answer === 'string');
  } finally {
    clearTimeout(timeout);
  }
}
