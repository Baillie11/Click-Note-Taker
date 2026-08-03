import { SessionEntry } from '../types';
import { formatAustralianTime } from './dateTime';

export function parseSessionEntries(serialized?: string): SessionEntry[] {
  if (!serialized) return [];

  try {
    const entries = JSON.parse(serialized) as SessionEntry[];
    return Array.isArray(entries)
      ? entries
          .filter((entry) => entry?.id && entry?.timestamp && entry?.text)
          .sort((first, second) => first.timestamp.localeCompare(second.timestamp))
      : [];
  } catch {
    return [];
  }
}

export function serializeSessionEntries(entries: SessionEntry[]): string {
  return JSON.stringify(entries);
}

export function getMinuteTimestampForDate(dateSource: string): string {
  const timestamp = new Date(dateSource);
  const currentTime = new Date();
  timestamp.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
  return timestamp.toISOString();
}

export function formatSessionEntries(entries: SessionEntry[]): string {
  if (entries.length === 0) return '[No live session entries added]';

  return entries
    .map((entry) => `${formatAustralianTime(entry.timestamp)}\n${entry.text}`)
    .join('\n\n');
}
