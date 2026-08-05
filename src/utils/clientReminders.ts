import { ClientReminderItem, NoteReminderChecklistItem } from '../types';

export const DEFAULT_CLIENT_REMINDERS = [
  { id: 'mileage', label: 'Record mileage' },
  { id: 'expenses', label: 'Record expenses and receipts' },
  { id: 'medication', label: 'Complete medication records' },
  { id: 'incident', label: 'Complete an incident report if required' },
  { id: 'handover', label: 'Complete handover and follow-up items' },
] as const;

const DEFAULT_IDS = new Set<string>(DEFAULT_CLIENT_REMINDERS.map(item => item.id));

export function parseReminderItemIds(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && DEFAULT_IDS.has(id))
      : [];
  } catch {
    return [];
  }
}

export function parseCustomReminderItems(value?: string): ClientReminderItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ClientReminderItem =>
      typeof item?.id === 'string' && typeof item?.label === 'string' && !!item.label.trim()
    );
  } catch {
    return [];
  }
}

export function buildReminderChecklist(
  selectedIds: string[],
  customItems: ClientReminderItem[]
): NoteReminderChecklistItem[] {
  const defaults = DEFAULT_CLIENT_REMINDERS
    .filter(item => selectedIds.includes(item.id))
    .map(item => ({ ...item, completed: false }));
  return [...defaults, ...customItems.map(item => ({ ...item, completed: false }))];
}

export function parseReminderChecklist(value?: string): NoteReminderChecklistItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is NoteReminderChecklistItem =>
      typeof item?.id === 'string' && typeof item?.label === 'string' && typeof item?.completed === 'boolean'
    );
  } catch {
    return [];
  }
}

export const serializeReminderItems = (items: ClientReminderItem[]): string => JSON.stringify(items);
export const serializeReminderItemIds = (ids: string[]): string => JSON.stringify(ids);
export const serializeReminderChecklist = (items: NoteReminderChecklistItem[]): string => JSON.stringify(items);
