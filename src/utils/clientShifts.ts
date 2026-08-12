import { ClientShift } from '../types';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseClientShifts(value?: string): ClientShift[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((shift): shift is ClientShift =>
      typeof shift?.id === 'string' &&
      Number.isInteger(shift?.weekday) && shift.weekday >= 0 && shift.weekday <= 6 &&
      /^\d{2}:\d{2}$/.test(shift?.startTime) && /^\d{2}:\d{2}$/.test(shift?.endTime)
    );
  } catch {
    return [];
  }
}

export function serializeClientShifts(shifts: ClientShift[]): string {
  return JSON.stringify(shifts);
}

export function isValidShiftTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

export function normalizeShiftTime(value: string): string {
  const [hours, minutes] = value.trim().split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function dateAtTime(base: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(base);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function isClientShiftActive(shifts: ClientShift[], now: Date = new Date()): boolean {
  return shifts.some(shift => {
    const start = dateAtTime(now, shift.startTime);
    const end = dateAtTime(now, shift.endTime);

    if (shift.endTime <= shift.startTime) {
      if (now.getDay() === shift.weekday) {
        end.setDate(end.getDate() + 1);
      } else {
        start.setDate(start.getDate() - 1);
        return start.getDay() === shift.weekday && now >= start && now < end;
      }
    } else if (now.getDay() !== shift.weekday) {
      return false;
    }

    return now >= start && now < end;
  });
}

export function areShiftsDuplicates(first: ClientShift, second: ClientShift): boolean {
  return first.weekday === second.weekday &&
    first.startTime === second.startTime &&
    first.endTime === second.endTime;
}

export function getScheduledShiftEnd(noteTime: string, shifts: ClientShift[]): string | undefined {
  const noteDate = new Date(noteTime);
  const candidates = shifts
    .filter(shift => shift.weekday === noteDate.getDay())
    .map(shift => {
      const start = dateAtTime(noteDate, shift.startTime);
      const end = dateAtTime(noteDate, shift.endTime);
      if (end <= start) end.setDate(end.getDate() + 1);
      return { start, end, distance: Math.abs(noteDate.getTime() - start.getTime()) };
    })
    .filter(({ start, end }) => noteDate >= new Date(start.getTime() - 2 * 60 * 60 * 1000) && noteDate <= end)
    .sort((a, b) => a.distance - b.distance);

  return candidates[0]?.end.toISOString();
}
