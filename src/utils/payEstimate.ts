import { Client, EmploymentType, Note, PayPeriodFrequency, PaySettings } from '../types';
import { getScheduledShiftWindow, parseClientShifts } from './clientShifts';

export interface PayPeriod {
  start: Date;
  end: Date;
}

export interface ShiftPayEstimate {
  note: Note;
  hours: number;
  multiplier: number;
  rate: number;
  gross: number;
  rateLabel: string;
  isPublicHoliday: boolean;
  paidStart: string;
  paidEnd: string;
  usesScheduledShift: boolean;
}

export interface PayEstimate {
  shifts: ShiftPayEstimate[];
  hours: number;
  gross: number;
  tax: number;
  net: number;
}

const TAX_SCALE_1 = [
  [188, 0.15, 0.15], [371, 0.2084, 11.0185], [515, 0.179, 0.1066],
  [932, 0.3227, 74.1674], [2246, 0.32, 71.6508], [3303, 0.39, 228.8816],
  [Number.POSITIVE_INFINITY, 0.47, 493.1893],
] as const;

const TAX_SCALE_2 = [
  [362, 0, 0], [538, 0.15, 54.3462], [673, 0.25, 108.2135],
  [721, 0.17, 54.3473], [865, 0.179, 60.8377], [1282, 0.3227, 185.1935],
  [2596, 0.32, 181.7319], [3653, 0.39, 363.4627],
  [Number.POSITIVE_INFINITY, 0.47, 655.7704],
] as const;

export function getCurrentPayPeriod(
  frequency: PayPeriodFrequency,
  weekStartsOn: number,
  offset = 0,
  now = new Date()
): PayPeriod {
  if (frequency === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    return { start, end };
  }

  const days = frequency === 'fortnightly' ? 14 : 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const distance = (start.getDay() - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - distance + offset * days);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return { start, end };
}

function awardBaseRate(settings: PaySettings): number {
  if (settings.employmentType === 'casual' && settings.rateIncludesCasualLoading) {
    return settings.hourlyRate / 1.25;
  }
  return settings.hourlyRate;
}

function getShiftRateForDate(
  shiftStart: Date,
  shiftEnd: Date,
  date: Date,
  employmentType: EmploymentType,
  isPublicHoliday: boolean
): { multiplier: number; label: string } {
  const casual = employmentType === 'casual';
  if (isPublicHoliday) return { multiplier: casual ? 2.75 : 2.5, label: 'Public holiday' };

  const day = date.getDay();
  if (day === 6) return { multiplier: casual ? 1.75 : 1.5, label: 'Saturday' };
  if (day === 0) return { multiplier: casual ? 2.25 : 2, label: 'Sunday' };

  const endMinutes = shiftEnd.getHours() * 60 + shiftEnd.getMinutes();
  const crossesMidnight = shiftEnd.getDate() !== shiftStart.getDate() || shiftEnd.getMonth() !== shiftStart.getMonth();
  if (crossesMidnight || shiftStart.getHours() < 6) {
    return { multiplier: casual ? 1.4 : 1.15, label: 'Night shift' };
  }
  if (endMinutes > 20 * 60) {
    return { multiplier: casual ? 1.375 : 1.125, label: 'Afternoon shift' };
  }
  return { multiplier: casual ? 1.25 : 1, label: 'Ordinary' };
}

export function estimatePay(
  notes: Note[],
  settings: PaySettings,
  clients: Record<string, Client> = {}
): PayEstimate {
  const baseRate = awardBaseRate(settings);
  const publicHolidays = new Set(settings.publicHolidayNoteIds);
  const shifts = notes.flatMap(note => {
    if (!note.timeOut) return [];
    const client = clients[note.clientId];
    const scheduled = getScheduledShiftWindow(note.timeIn, parseClientShifts(client?.shifts));
    const paidStart = scheduled?.start || note.timeIn;
    const paidEnd = scheduled?.end || note.timeOut;
    const shiftStart = new Date(paidStart);
    const shiftEnd = new Date(paidEnd);
    const hours = Math.max(0, (shiftEnd.getTime() - shiftStart.getTime()) / 3600000);
    const isPublicHoliday = publicHolidays.has(note.id);
    let cursor = new Date(shiftStart);
    const end = new Date(shiftEnd);
    let gross = 0;
    const labels = new Set<string>();
    while (cursor < end) {
      const nextMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      const segmentEnd = nextMidnight < end ? nextMidnight : end;
      const segmentHours = (segmentEnd.getTime() - cursor.getTime()) / 3600000;
      const segmentRate = getShiftRateForDate(shiftStart, shiftEnd, cursor, settings.employmentType, isPublicHoliday);
      gross += segmentHours * baseRate * segmentRate.multiplier;
      labels.add(segmentRate.label);
      cursor = segmentEnd;
    }
    const rate = hours ? gross / hours : 0;
    const multiplier = baseRate ? rate / baseRate : 0;
    return [{
      note,
      hours,
      multiplier,
      rate,
      gross,
      rateLabel: [...labels].join(' / '),
      isPublicHoliday,
      paidStart,
      paidEnd,
      usesScheduledShift: Boolean(scheduled),
    }];
  });
  const hours = shifts.reduce((sum, shift) => sum + shift.hours, 0);
  const gross = shifts.reduce((sum, shift) => sum + shift.gross, 0);
  const tax = estimatePaygWithholding(gross, settings.payPeriodFrequency, settings.claimsTaxFreeThreshold);
  return { shifts, hours, gross, tax, net: Math.max(0, gross - tax) };
}

export function estimatePaygWithholding(
  gross: number,
  frequency: PayPeriodFrequency,
  claimsTaxFreeThreshold: boolean
): number {
  if (gross <= 0) return 0;
  const weekly = frequency === 'weekly' ? gross : frequency === 'fortnightly' ? gross / 2 : gross * 3 / 13;
  const x = Math.floor(weekly) + 0.99;
  const row = (claimsTaxFreeThreshold ? TAX_SCALE_2 : TAX_SCALE_1).find(([limit]) => x < limit)!;
  const weeklyTax = Math.max(0, Math.round(row[1] * x - row[2]));
  if (frequency === 'fortnightly') return weeklyTax * 2;
  if (frequency === 'monthly') return Math.round(weeklyTax * 13 / 3);
  return weeklyTax;
}
