import { ClientGoal } from '../types';

export function parseClientGoals(value?: string): ClientGoal[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ClientGoal =>
      typeof item?.id === 'string' && typeof item?.label === 'string' && !!item.label.trim()
    );
  } catch {
    return [];
  }
}

export const serializeClientGoals = (goals: ClientGoal[]): string => JSON.stringify(goals);

export function parseSelectedGoalLabels(value?: string): string[] {
  if (!value) return [];
  return value.split(',').map(label => label.trim()).filter(Boolean);
}

export const serializeSelectedGoalLabels = (labels: string[]): string => labels.join(', ');
